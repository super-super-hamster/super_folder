package usn

const (
	FSCTL_QUERY_USN_JOURNAL = 0x000900f4
	FSCTL_ENUM_USN_DATA     = 0x000900b3
	FSCTL_READ_USN_JOURNAL  = 0x000900bb

	USN_REASON_FILE_CREATE       = 0x00000100
	USN_REASON_FILE_DELETE       = 0x00000200
	USN_REASON_RENAME_NEW_NAME   = 0x00002000
	USN_REASON_RENAME_OLD_NAME   = 0x00001000
	USN_REASON_CLOSE             = 0x80000000
	USN_REASON_BASIC_INFO_CHANGE = 0x00008000
)

type MFT_ENUM_DATA_V0 struct {
	StartFileReferenceNumber uint64
	LowUsn                   int64
	HighUsn                  int64
}

type USN_JOURNAL_DATA_V0 struct {
	UsnJournalID    uint64
	FirstUsn        int64
	NextUsn         int64
	LowestValidUsn  int64
	MaxUsn          int64
	MaximumSize     uint64
	AllocationDelta uint64
}

type READ_USN_JOURNAL_DATA_V0 struct {
	StartUsn          int64
	ReasonMask        uint32
	ReturnOnlyOnClose uint32
	Timeout           uint64
	BytesToWaitFor    uint64
	UsnJournalID      uint64
}

type USN_RECORD_V2 struct {
	RecordLength              uint32
	MajorVersion              uint16
	MinorVersion              uint16
	FileReferenceNumber       uint64
	ParentFileReferenceNumber uint64
	Usn                       int64
	TimeStamp                 int64
	Reason                    uint32
	SourceInfo                uint32
	SecurityId                uint32
	FileAttributes            uint32
	FileNameLength            uint16
	FileNameOffset            uint16
}

type FileNode struct {
	ParentFRN uint64
	Name      string
	IsFolder  bool
}

