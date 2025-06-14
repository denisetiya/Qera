// High-performance Go FastHTTP server for benchmarking
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/valyala/fasthttp"
)

// Response type for JSON responses
type Response struct {
	Message string      `json:"message,omitempty"`
	ID      string      `json:"id,omitempty"`
	Body    interface{} `json:"body,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// Pre-computed JSON responses for common routes
var (
	helloWorldJSON []byte
	notFoundJSON   []byte
	methodNotAllowedJSON []byte
)

func init() {
	var err error
	// Pre-compute common JSON responses
	helloWorldJSON, err = json.Marshal(Response{Message: "Hello, World!"})
	if err != nil {
		log.Fatal("Failed to marshal hello world response")
	}
	
	notFoundJSON, err = json.Marshal(Response{Error: "Not found"})
	if err != nil {
		log.Fatal("Failed to marshal not found response")
	}
	
	methodNotAllowedJSON, err = json.Marshal(Response{Error: "Method not allowed"})
	if err != nil {
		log.Fatal("Failed to marshal method not allowed response")
	}
}

// Main request handler
func requestHandler(ctx *fasthttp.RequestCtx) {
	path := string(ctx.Path())
	method := string(ctx.Method())
	
	// Set common headers
	ctx.Response.Header.Set("Content-Type", "application/json")
	
	// Route handling
	switch {
	case path == "/":
		// Root endpoint - Hello World
		ctx.Write(helloWorldJSON)
		
	case strings.HasPrefix(path, "/users/"):
		// User endpoint with parameter
		id := strings.TrimPrefix(path, "/users/")
		if id == "" {
			ctx.SetStatusCode(fasthttp.StatusNotFound)
			ctx.Write(notFoundJSON)
			return
		}
		
		// Generate response with ID
		response, _ := json.Marshal(Response{ID: id})
		ctx.Write(response)
		
	case path == "/echo":
		// Echo endpoint
		if method != "POST" {
			ctx.SetStatusCode(fasthttp.StatusMethodNotAllowed)
			ctx.Write(methodNotAllowedJSON)
			return
		}
		
		// Parse JSON body
		var body map[string]interface{}
		if err := json.Unmarshal(ctx.PostBody(), &body); err != nil {
			ctx.SetStatusCode(fasthttp.StatusBadRequest)
			errorResponse, _ := json.Marshal(Response{Error: err.Error()})
			ctx.Write(errorResponse)
			return
		}
		
		// Echo back the body
		response, _ := json.Marshal(body)
		ctx.Write(response)
		
	default:
		// Not found
		ctx.SetStatusCode(fasthttp.StatusNotFound)
		ctx.Write(notFoundJSON)
	}
}

func main() {
	// Setup signal handling for graceful shutdown
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)
	
	// Configure server
	server := &fasthttp.Server{
		Handler: requestHandler,
		Name:    "GoFastHTTPServer/1.0",
	}
	
	// Start server in a goroutine
	go func() {
		addr := ":3004"
		fmt.Printf("Go FastHTTP server listening on http://localhost%s\n", addr)
		if err := server.ListenAndServe(addr); err != nil {
			log.Fatalf("Server error: %v", err)
		}
	}()
	
	// Wait for interrupt signal
	<-done
	fmt.Println("Go FastHTTP server shutting down...")
	
	// Shutdown server
	if err := server.Shutdown(); err != nil {
		log.Fatalf("Server shutdown error: %v", err)
	}
	
	fmt.Println("Go FastHTTP server stopped")
}
