package service

import (
	"log"

	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/debug"
)

type myService struct{}

const serviceName = "super_folder-search"

func (m *myService) Execute(args []string, r <-chan svc.ChangeRequest, changes chan<- svc.Status) (ssec bool, errno uint32) {
	const cmdsAccepted = svc.AcceptStop | svc.AcceptShutdown
	changes <- svc.Status{State: svc.StartPending}

	// Start Searcher
	searcher := NewSearcher()
	searcher.Start()

	changes <- svc.Status{State: svc.Running, Accepts: cmdsAccepted}
loop:
	for {
		c := <-r
		switch c.Cmd {
		case svc.Interrogate:
			changes <- c.CurrentStatus
		case svc.Stop, svc.Shutdown:
			break loop
		}
	}

	// Shutdown servers cleanly
	searcher.Stop()

	changes <- svc.Status{State: svc.StopPending}
	return
}

func Run() error {
	log.Println("Starting super_folder-search service...")

	isInteractive, err := svc.IsAnInteractiveSession()
	if err != nil {
		log.Printf("failed to determine if we are running in an interactive session: %v", err)
		return err
	}

	if isInteractive {
		log.Println("Running in interactive mode...")
		return debug.Run(serviceName, &myService{})
	}

	return svc.Run(serviceName, &myService{})
}
