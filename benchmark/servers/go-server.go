// High-performance Go HTTP server for benchmarking
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
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

func main() {
	// Setup router with optimized settings
	router := http.NewServeMux()
	
	// Root endpoint - Hello World
	router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			w.WriteHeader(http.StatusNotFound)
			w.Header().Set("Content-Type", "application/json")
			w.Write(notFoundJSON)
			return
		}
		
		w.Header().Set("Content-Type", "application/json")
		w.Write(helloWorldJSON)
	})

	// User endpoint with parameter
	router.HandleFunc("/users/", func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/users/")
		if id == "" {
			w.WriteHeader(http.StatusNotFound)
			w.Header().Set("Content-Type", "application/json")
			w.Write(notFoundJSON)
			return
		}
		
		// Generate the response specifically for this ID
		response, _ := json.Marshal(Response{ID: id})
		
		w.Header().Set("Content-Type", "application/json")
		w.Write(response)
	})

	// Echo endpoint
	router.HandleFunc("/echo", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			w.WriteHeader(http.StatusMethodNotAllowed)
			w.Header().Set("Content-Type", "application/json")
			w.Write(methodNotAllowedJSON)
			return
		}

		// Read and parse the request body
		var body map[string]interface{}
		decoder := json.NewDecoder(r.Body)
		if err := decoder.Decode(&body); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			w.Header().Set("Content-Type", "application/json")
			errorResponse, _ := json.Marshal(Response{Error: err.Error()})
			w.Write(errorResponse)
			return
		}
		
		// Echo the body back
		response, _ := json.Marshal(body)
		w.Header().Set("Content-Type", "application/json")
		w.Write(response)
	})

	// Configure server with timeouts
	server := &http.Server{
		Addr:         ":3003",
		Handler:      router,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}
	
	// Setup graceful shutdown
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)
	
	go func() {
		fmt.Printf("Go server listening on http://localhost:3003\n")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()
	
	// Wait for interrupt signal
	<-done
	fmt.Println("Go server shutting down...")
	
	// Create a context with timeout for shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	// Attempt graceful shutdown
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server shutdown error: %v", err)
	}
	
	fmt.Println("Go server stopped")
}
}
