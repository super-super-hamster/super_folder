package terminal

import (
	"context"
	"fmt"
	"io"
	"strings"
	"sync"

	"github.com/UserExistsError/conpty"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type TerminalService struct {
	ctx    context.Context
	cpty   *conpty.ConPty
	mu     sync.Mutex
	currentDir string
}

func NewTerminalService() *TerminalService {
	return &TerminalService{}
}

func (s *TerminalService) SetContext(ctx context.Context) {
	s.ctx = ctx
}

func (s *TerminalService) Start(dir string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.cpty != nil {
		return nil
	}

	// Escape quotes for powershell -Command
	promptFunc := `function prompt { '{0}[38;2;255;108;2m@cmd{0}[0m ' -f [char]27 + (Get-Location).Path + '> ' }`
	
	initCmd := promptFunc
	if dir != "" {
		initCmd += fmt.Sprintf("; Set-Location -LiteralPath '%s'", strings.ReplaceAll(dir, "'", "''"))
	}
	initCmd += "; Clear-Host"

	s.currentDir = dir

	cpty, err := conpty.Start(fmt.Sprintf(`powershell.exe -NoLogo -NoExit -Command "%s"`, initCmd), conpty.ConPtyDimensions(80, 24))
	if err != nil {
		return err
	}
	s.cpty = cpty

	go s.readPump()
	s.listenEvents()

	return nil
}

func (s *TerminalService) readPump() {
	buf := make([]byte, 2048)
	for {
		s.mu.Lock()
		cpty := s.cpty
		s.mu.Unlock()
		if cpty == nil {
			break
		}

		n, err := cpty.Read(buf)
		if err != nil {
			if err == io.EOF {
				break
			}
			continue
		}

		out := string(buf[:n])
		if out != "" {
			runtime.EventsEmit(s.ctx, "terminal:output", out)
		}
	}
}

func (s *TerminalService) listenEvents() {
	runtime.EventsOn(s.ctx, "terminal:input", func(optionalData ...interface{}) {
		if len(optionalData) == 0 {
			return
		}
		data, ok := optionalData[0].(string)
		if !ok {
			return
		}

		s.mu.Lock()
		cpty := s.cpty
		s.mu.Unlock()

		if cpty != nil {
			cpty.Write([]byte(data))
		}
	})

	runtime.EventsOn(s.ctx, "terminal:resize", func(optionalData ...interface{}) {
		if len(optionalData) == 0 {
			return
		}
		dims, ok := optionalData[0].(map[string]interface{})
		if !ok {
			return
		}
		cols, ok1 := dims["cols"].(float64)
		rows, ok2 := dims["rows"].(float64)

		s.mu.Lock()
		cpty := s.cpty
		s.mu.Unlock()

		if cpty != nil && ok1 && ok2 {
			cpty.Resize(int(cols), int(rows))
		}
	})

	runtime.EventsOn(s.ctx, "terminal:sf:command", func(optionalData ...interface{}) {
		if len(optionalData) == 0 {
			return
		}
		cmd, ok := optionalData[0].(string)
		if !ok {
			return
		}
		
		// For now, just print a not implemented message
		msg := fmt.Sprintf("\r\nsf command '%s' is not implemented yet.\r\n@sf > ", cmd)
		runtime.EventsEmit(s.ctx, "terminal:output", msg)
	})
}

func (s *TerminalService) Close() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.cpty != nil {
		s.cpty.Close()
		s.cpty = nil
	}
}

