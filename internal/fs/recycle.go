package fs

import (
	"fmt"
	"syscall"
	"unsafe"
)

const (
	FO_DELETE          = 0x0003
	FOF_ALLOWUNDO      = 0x0040
	FOF_NOCONFIRMATION = 0x0010
)

type SHFILEOPSTRUCT struct {
	Hwnd                  uintptr
	WFunc                 uint32
	PFrom                 *uint16
	PTo                   *uint16
	FFlags                uint16
	FAnyOperationsAborted int32
	HNameMappings         uintptr
	LpszProgressTitle     *uint16
}

var (
	shell32          = syscall.NewLazyDLL("shell32.dll")
	shFileOperationW = shell32.NewProc("SHFileOperationW")
)

// DeleteToRecycleBin moves multiple paths to the recycle bin using SHFileOperationW.
func DeleteToRecycleBin(paths []string) error {
	if len(paths) == 0 {
		return nil
	}

	var utf16Paths []uint16
	for _, p := range paths {
		utf16Paths = append(utf16Paths, syscall.StringToUTF16(p)...)
	}
	utf16Paths = append(utf16Paths, 0) // double null termination

	pFrom := &utf16Paths[0]

	op := SHFILEOPSTRUCT{
		Hwnd:   0,
		WFunc:  FO_DELETE,
		PFrom:  pFrom,
		FFlags: FOF_ALLOWUNDO | FOF_NOCONFIRMATION,
	}

	ret, _, _ := shFileOperationW.Call(uintptr(unsafe.Pointer(&op)))
	if ret != 0 {
		return fmt.Errorf("SHFileOperationW failed with code %d", ret)
	}
	return nil
}

