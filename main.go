package main

import (
	"embed"

	"encoding/json"
	"file-manager/internal/database"
	"file-manager/internal/thumbnail"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Initialize database
	err := database.InitDB()
	if err != nil {
		println("DB Init Error:", err.Error())
	}

	// Read window bounds
	width, height := 1024, 768
	var config struct {
		Width  int `json:"width"`
		Height int `json:"height"`
	}
	if boundsStr, err := database.GetConfig("window_bounds"); err == nil && boundsStr != "" {
		if err := json.Unmarshal([]byte(boundsStr), &config); err == nil {
			if config.Width > 400 && config.Height > 300 {
				width = config.Width
				height = config.Height
			}
		}
	}

	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err = wails.Run(&options.App{
		Title:  "file-manager",
		Width:  width,
		Height: height,
		Frameless: true,
		AssetServer: &assetserver.Options{
			Assets:  assets,
			Handler: thumbnail.NewHandler(),
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 0},
		OnStartup:        app.startup,
		OnBeforeClose:    app.beforeClose,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
