// Simple Go FastHTTP server for benchmarking
package main

import (
	"encoding/json"
	"fmt"
	"github.com/valyala/fasthttp"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
)

// Response struct for JSON responses
type Response struct {
	Message string      `json:"message,omitempty"`
	ID      string      `json:"id,omitempty"`
	Body    interface{} `json:"body,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func main() {
	// Handle graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	
	go func() {
		<-sigCh
		fmt.Println("Go FastHTTP server shutting down")
		os.Exit(0)
	}()
	
	// Request handler
	handler := func(ctx *fasthttp.RequestCtx) {
		path := string(ctx.Path())
		method := string(ctx.Method())
		
		ctx.Response.Header.Set("Content-Type", "application/json")
		
		switch {
		case path == "/":
			response, _ := json.Marshal(Response{
				Message: "Hello, World!",
			})
			ctx.Write(response)
			
		case strings.HasPrefix(path, "/users/"):
			id := strings.TrimPrefix(path, "/users/")
			if id == "" {
				ctx.SetStatusCode(fasthttp.StatusNotFound)
				return
			}
			
			response, _ := json.Marshal(Response{
				ID: id,
			})
			ctx.Write(response)
			
		case path == "/echo":
			if method != "POST" {
				ctx.SetStatusCode(fasthttp.StatusMethodNotAllowed)
				return
			}
			
			var body map[string]interface{}
			if err := json.Unmarshal(ctx.PostBody(), &body); err != nil {
				ctx.SetStatusCode(fasthttp.StatusBadRequest)
				errorResponse, _ := json.Marshal(Response{
					Error: err.Error(),
				})
				ctx.Write(errorResponse)
				return
			}
			
			response, _ := json.Marshal(body)
			ctx.Write(response)
			
		default:
			ctx.SetStatusCode(fasthttp.StatusNotFound)
		}
	}
	
	port := 3004
	fmt.Printf("Go FastHTTP server listening on http://localhost:%d\n", port)
	
	if err := fasthttp.ListenAndServe(fmt.Sprintf(":%d", port), handler); err != nil {
		log.Fatalf("Failed to start Go FastHTTP server: %v", err)
	}
}
