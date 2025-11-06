#!/bin/bash
#
# Universal AI CLI Wrapper Template
#
# This script wraps any AI CLI tool and automatically injects OpenMemory context.
# Copy and customize for specific tools (ai-aider, ai-cursor, etc.)
#

# Configuration
TOOL_NAME="${TOOL_NAME:-unknown-ai-tool}"
TOOL_COMMAND="${TOOL_COMMAND:-echo}"
CONTEXT_MANAGER_URL="${CONTEXT_MANAGER_URL:-http://localhost:8081}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to fetch context
fetch_context() {
    local project_name="$1"

    echo -e "${YELLOW}[AI Wrapper] Fetching context for: ${project_name}${NC}" >&2

    # Try to fetch context from Context Manager
    local context=$(curl -s "${CONTEXT_MANAGER_URL}/context/${project_name}?format=markdown" | jq -r '.context // empty')

    if [ -z "$context" ]; then
        echo -e "${YELLOW}[AI Wrapper] No context available, trying auto-detect...${NC}" >&2
        context=$(curl -s "${CONTEXT_MANAGER_URL}/context/auto?format=markdown" | jq -r '.context // empty')
    fi

    if [ -n "$context" ]; then
        echo -e "${GREEN}[AI Wrapper] Context loaded successfully${NC}" >&2
        echo "$context"
    else
        echo -e "${YELLOW}[AI Wrapper] Could not fetch context, continuing without it${NC}" >&2
        echo ""
    fi
}

# Function to detect project name
detect_project() {
    # Try to find .openmemory link file
    local dir="$(pwd)"
    while [ "$dir" != "/" ]; do
        if [ -f "$dir/.openmemory" ]; then
            basename "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done

    # Fallback: use current directory name
    basename "$(pwd)"
}

# Main wrapper logic
main() {
    echo -e "${GREEN}[AI Wrapper] Starting ${TOOL_NAME} with OpenMemory context${NC}" >&2
    echo "" >&2

    # Detect project
    local project=$(detect_project)
    echo -e "${GREEN}[AI Wrapper] Detected project: ${project}${NC}" >&2

    # Fetch context
    local context=$(fetch_context "$project")

    # Check if we should inject context
    if [ -n "$context" ] && [ "${INJECT_CONTEXT:-yes}" = "yes" ]; then
        # Create temporary file with context + user prompt
        local temp_file=$(mktemp)

        echo "# OpenMemory Context (Auto-Injected)" > "$temp_file"
        echo "" >> "$temp_file"
        echo "$context" >> "$temp_file"
        echo "" >> "$temp_file"
        echo "---" >> "$temp_file"
        echo "" >> "$temp_file"
        echo "# User Request" >> "$temp_file"
        echo "" >> "$temp_file"

        # If first argument looks like a prompt/message, add it
        if [ $# -gt 0 ]; then
            # Check if it's a file or a direct prompt
            if [ -f "$1" ]; then
                cat "$1" >> "$temp_file"
            else
                echo "$@" >> "$temp_file"
            fi
        fi

        echo "" >&2
        echo -e "${GREEN}[AI Wrapper] Launching ${TOOL_NAME} with injected context...${NC}" >&2
        echo "" >&2

        # Execute the actual tool with context-enhanced prompt
        # Adjust based on tool's CLI format
        if [ -f "$1" ]; then
            # First arg was a file, replace it with our enhanced version
            shift
            ${TOOL_COMMAND} --file "$temp_file" "$@"
        elif [ $# -gt 0 ]; then
            # Direct prompt given, pass enhanced version
            ${TOOL_COMMAND} --message "$(cat $temp_file)" "${@:2}"
        else
            # No prompt, just start tool (context available in file if needed)
            ${TOOL_COMMAND} "$@"
        fi

        local exit_code=$?

        # Cleanup
        rm -f "$temp_file"

        exit $exit_code
    else
        # No context or injection disabled, just run tool normally
        echo "" >&2
        echo -e "${YELLOW}[AI Wrapper] Launching ${TOOL_NAME} without context${NC}" >&2
        echo "" >&2
        ${TOOL_COMMAND} "$@"
    fi
}

# Run main function
main "$@"
