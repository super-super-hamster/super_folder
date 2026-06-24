package usn

import (
	"fmt"
	"log"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
)

type Engine struct {
	driveLetter string
	handle      windows.Handle
	journalID   uint64
	nextUsn     int64

	Mu    sync.RWMutex
	Nodes map[uint64]*FileNode

	onRename func(oldPath, newPath string)
}

func NewEngine(driveLetter string, onRename func(oldPath, newPath string)) *Engine {
	// e.g. "C"
	return &Engine{
		driveLetter: driveLetter,
		Nodes:       make(map[uint64]*FileNode),
		onRename:    onRename,
	}
}

func (e *Engine) Init() error {
	drivePath := `\\.\` + e.driveLetter + `:`
	h, err := windows.CreateFile(
		syscall.StringToUTF16Ptr(drivePath),
		windows.GENERIC_READ,
		windows.FILE_SHARE_READ|windows.FILE_SHARE_WRITE,
		nil,
		windows.OPEN_EXISTING,
		windows.FILE_ATTRIBUTE_NORMAL,
		0,
	)
	if err != nil {
		return fmt.Errorf("CreateFile error: %w", err)
	}
	e.handle = h

	var journalData USN_JOURNAL_DATA_V0
	var bytesReturned uint32
	err = windows.DeviceIoControl(
		e.handle,
		FSCTL_QUERY_USN_JOURNAL,
		nil,
		0,
		(*byte)(unsafe.Pointer(&journalData)),
		uint32(unsafe.Sizeof(journalData)),
		&bytesReturned,
		nil,
	)
	if err != nil {
		windows.CloseHandle(e.handle)
		return fmt.Errorf("query USN Journal error: %w", err)
	}

	e.journalID = journalData.UsnJournalID
	e.nextUsn = journalData.NextUsn

	// Load MFT initially
	return e.loadMFT()
}

func (e *Engine) Close() {
	if e.handle != 0 {
		windows.CloseHandle(e.handle)
		e.handle = 0
	}
}

func (e *Engine) loadMFT() error {
	log.Printf("[%s:] Starting MFT enumeration...", e.driveLetter)
	med := MFT_ENUM_DATA_V0{
		StartFileReferenceNumber: 0,
		LowUsn:                   0,
		HighUsn:                  e.nextUsn,
	}

	buf := make([]byte, 64*1024) // 64KB
	var bytesReturned uint32

	count := 0
	for {
		err := windows.DeviceIoControl(
			e.handle,
			FSCTL_ENUM_USN_DATA,
			(*byte)(unsafe.Pointer(&med)),
			uint32(unsafe.Sizeof(med)),
			&buf[0],
			uint32(len(buf)),
			&bytesReturned,
			nil,
		)

		if err != nil {
			if err == windows.ERROR_HANDLE_EOF || err.Error() == "The handle is at end-of-file" || err.Error() == "EOF" {
				break
			}
			return fmt.Errorf("enum USN Data error: %w", err)
		}

		// First 8 bytes are the next StartFileReferenceNumber
		nextFRN := *(*uint64)(unsafe.Pointer(&buf[0]))
		med.StartFileReferenceNumber = nextFRN

		recordPtr := uintptr(unsafe.Pointer(&buf[8]))
		endPtr := uintptr(unsafe.Pointer(&buf[0])) + uintptr(bytesReturned)

		e.Mu.Lock()
		for recordPtr < endPtr {
			record := (*USN_RECORD_V2)(unsafe.Pointer(recordPtr))
			if record.RecordLength == 0 {
				break
			}

			namePtr := recordPtr + uintptr(record.FileNameOffset)
			nameSlice := unsafe.Slice((*uint16)(unsafe.Pointer(namePtr)), record.FileNameLength/2)
			name := syscall.UTF16ToString(nameSlice)

			isFolder := (record.FileAttributes & windows.FILE_ATTRIBUTE_DIRECTORY) != 0

			e.Nodes[record.FileReferenceNumber] = &FileNode{
				ParentFRN: record.ParentFileReferenceNumber,
				Name:      name,
				IsFolder:  isFolder,
			}
			count++

			recordPtr += uintptr(record.RecordLength)
		}
		e.Mu.Unlock()
	}

	log.Printf("[%s:] MFT enumeration complete. Loaded %d files/folders.", e.driveLetter, count)
	return nil
}

// GetFullPath computes the absolute path for a given FRN
func (e *Engine) GetFullPath(frn uint64) string {
	e.Mu.RLock()
	defer e.Mu.RUnlock()
	return e.GetFullPathLocked(frn)
}

func (e *Engine) GetFullPathLocked(frn uint64) string {
	var parts []string
	curr := frn

	for {
		node, exists := e.Nodes[curr]
		if !exists {
			break
		}
		parts = append(parts, node.Name)
		if node.ParentFRN == curr || node.ParentFRN == 0 {
			break
		}
		curr = node.ParentFRN
	}

	if len(parts) == 0 {
		return ""
	}

	for i, j := 0, len(parts)-1; i < j; i, j = i+1, j-1 {
		parts[i], parts[j] = parts[j], parts[i]
	}

	res := e.driveLetter + `:\` + strings.Join(parts, `\`)
	res = strings.ReplaceAll(res, `\.\`, `\`)
	return res
}

func (e *Engine) StartListening(stopCh <-chan struct{}) {
	go e.listen(stopCh)
}

func (e *Engine) listen(stopCh <-chan struct{}) {
	rujd := READ_USN_JOURNAL_DATA_V0{
		StartUsn:          e.nextUsn,
		ReasonMask:        0xFFFFFFFF,
		ReturnOnlyOnClose: 0,
		Timeout:           1, // 1 second timeout for checking stopCh
		BytesToWaitFor:    1,
		UsnJournalID:      e.journalID,
	}

	buf := make([]byte, 64*1024)
	var bytesReturned uint32

	log.Printf("[%s:] Started USN listening...", e.driveLetter)

	for {
		select {
		case <-stopCh:
			log.Printf("[%s:] Stopped USN listening.", e.driveLetter)
			return
		default:
		}

		err := windows.DeviceIoControl(
			e.handle,
			FSCTL_READ_USN_JOURNAL,
			(*byte)(unsafe.Pointer(&rujd)),
			uint32(unsafe.Sizeof(rujd)),
			&buf[0],
			uint32(len(buf)),
			&bytesReturned,
			nil,
		)

		if err != nil {
			if err == windows.ERROR_TIMEOUT || err == windows.ERROR_IO_INCOMPLETE || err == windows.ERROR_HANDLE_EOF || err.Error() == "The wait operation timed out." {
				continue
			}
			log.Printf("[%s:] USN Journal read error: %v", e.driveLetter, err)
			time.Sleep(1 * time.Second)
			continue
		}

		if bytesReturned < 8 {
			continue
		}

		nextUSN := *(*int64)(unsafe.Pointer(&buf[0]))
		rujd.StartUsn = nextUSN

		recordPtr := uintptr(unsafe.Pointer(&buf[8]))
		endPtr := uintptr(unsafe.Pointer(&buf[0])) + uintptr(bytesReturned)

		e.Mu.Lock()
		for recordPtr < endPtr {
			record := (*USN_RECORD_V2)(unsafe.Pointer(recordPtr))
			if record.RecordLength == 0 {
				break
			}

			namePtr := recordPtr + uintptr(record.FileNameOffset)
			nameSlice := unsafe.Slice((*uint16)(unsafe.Pointer(namePtr)), record.FileNameLength/2)
			name := syscall.UTF16ToString(nameSlice)

			isFolder := (record.FileAttributes & windows.FILE_ATTRIBUTE_DIRECTORY) != 0

			if (record.Reason & USN_REASON_FILE_CREATE) != 0 {
				e.Nodes[record.FileReferenceNumber] = &FileNode{
					ParentFRN: record.ParentFileReferenceNumber,
					Name:      name,
					IsFolder:  isFolder,
				}
			} else if (record.Reason & USN_REASON_RENAME_NEW_NAME) != 0 {
				if node, ok := e.Nodes[record.FileReferenceNumber]; ok {
					oldPath := e.GetFullPathLocked(record.FileReferenceNumber)
					node.Name = name
					node.ParentFRN = record.ParentFileReferenceNumber
					newPath := e.GetFullPathLocked(record.FileReferenceNumber)

					if e.onRename != nil && oldPath != newPath {
						e.onRename(oldPath, newPath)
					}
				} else {
					e.Nodes[record.FileReferenceNumber] = &FileNode{
						ParentFRN: record.ParentFileReferenceNumber,
						Name:      name,
						IsFolder:  isFolder,
					}
				}
			} else if (record.Reason & USN_REASON_FILE_DELETE) != 0 {
				delete(e.Nodes, record.FileReferenceNumber)
			}

			recordPtr += uintptr(record.RecordLength)
		}
		e.Mu.Unlock()
	}
}

