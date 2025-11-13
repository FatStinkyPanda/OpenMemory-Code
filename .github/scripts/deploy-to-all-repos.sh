#!/bin/bash
###############################################################################
# OpenMemory-Code: Deploy to All Repositories Script
###############################################################################
#
# This script automatically adds OpenMemory-Code automation to all your
# GitHub repositories.
#
# Usage:
#   bash deploy-to-all-repos.sh [github-username]
#
# Requirements:
#   - GitHub CLI (gh) installed and authenticated
#   - Git installed
#   - jq for JSON parsing
#
# What it does:
#   1. Lists all your repositories
#   2. For each repository:
#      - Clones it (shallow)
#      - Copies .github workflows and actions
#      - Commits and pushes changes
#      - Triggers the auto-init workflow
#
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️ ${NC}$1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

# Check requirements
check_requirements() {
    log_info "Checking requirements..."

    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed"
        log_info "Install from: https://cli.github.com/"
        exit 1
    fi

    if ! command -v git &> /dev/null; then
        log_error "Git is not installed"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed (needed for JSON parsing)"
        log_info "Install: sudo apt install jq (Ubuntu) or brew install jq (Mac)"
        exit 1
    fi

    # Check if authenticated
    if ! gh auth status &> /dev/null; then
        log_error "Not authenticated with GitHub CLI"
        log_info "Run: gh auth login"
        exit 1
    fi

    log_success "All requirements met"
}

# Get OpenMemory-Code root
get_openmemory_root() {
    # Script is in .github/scripts/, so go up two levels
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    OPENMEMORY_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
    echo "$OPENMEMORY_ROOT"
}

# Get list of repositories
get_repos() {
    local username="$1"
    log_info "Fetching repositories for user: $username..."

    # Get all repos (public and private)
    REPOS=$(gh repo list "$username" --limit 1000 --json name,isPrivate,isFork --jq '.[] | select(.isFork == false) | .name')

    if [ -z "$REPOS" ]; then
        log_error "No repositories found for user: $username"
        exit 1
    fi

    local count=$(echo "$REPOS" | wc -l)
    log_success "Found $count repositories"

    echo "$REPOS"
}

# Process a single repository
process_repo() {
    local username="$1"
    local repo="$2"
    local openmemory_root="$3"
    local work_dir="$4"

    log_info "Processing: $repo"

    local repo_dir="$work_dir/$repo"

    # Clone repository (shallow)
    log_info "  Cloning..."
    if ! git clone --depth 1 "https://github.com/$username/$repo.git" "$repo_dir" 2>/dev/null; then
        log_error "  Failed to clone $repo"
        return 1
    fi

    cd "$repo_dir"

    # Check if already set up
    if [ -f ".openmemory" ] && [ -d ".ai-agents" ]; then
        log_warning "  Already has OpenMemory-Code - skipping"
        cd - > /dev/null
        return 0
    fi

    # Create .github directories
    mkdir -p .github/workflows .github/actions

    # Copy workflows
    log_info "  Copying workflows..."
    cp -r "$openmemory_root/.github/workflows/"*.yml .github/workflows/ 2>/dev/null || log_warning "  No workflows to copy"

    # Copy actions
    log_info "  Copying actions..."
    cp -r "$openmemory_root/.github/actions/"* .github/actions/ 2>/dev/null || log_warning "  No actions to copy"

    # Check if there are changes
    if git diff --quiet && git diff --cached --quiet; then
        log_warning "  No changes needed"
        cd - > /dev/null
        return 0
    fi

    # Configure git
    git config user.name "OpenMemory-Code Bot"
    git config user.email "bot@openmemory-code.local"

    # Commit changes
    log_info "  Committing changes..."
    git add .github
    git commit -m "🤖 Add OpenMemory-Code automation

- Added auto-initialization workflow
- Added enforcement validation workflow
- Added openmemory-setup composite action

OpenMemory-Code will automatically configure on next push.

Deployed by: deploy-to-all-repos.sh" || {
        log_error "  Failed to commit"
        cd - > /dev/null
        return 1
    }

    # Push changes
    log_info "  Pushing changes..."
    if git push origin main 2>/dev/null || git push origin master 2>/dev/null; then
        log_success "  Successfully deployed to $repo"
    else
        log_error "  Failed to push to $repo"
        cd - > /dev/null
        return 1
    fi

    # Trigger the auto-init workflow
    log_info "  Triggering auto-init workflow..."
    gh workflow run openmemory-auto-init.yml --repo "$username/$repo" 2>/dev/null || {
        log_warning "  Could not trigger workflow (may not exist yet)"
    }

    cd - > /dev/null
    log_success "Completed: $repo"
    return 0
}

# Main function
main() {
    echo "═══════════════════════════════════════════════════════════════════"
    echo "OpenMemory-Code: Deploy to All Repositories"
    echo "═══════════════════════════════════════════════════════════════════"
    echo ""

    # Check requirements
    check_requirements
    echo ""

    # Get username
    local username="${1:-$(gh api user -q .login)}"
    log_info "GitHub user: $username"
    echo ""

    # Confirm
    read -p "Deploy OpenMemory-Code to ALL repositories for $username? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        log_warning "Aborted by user"
        exit 0
    fi
    echo ""

    # Get OpenMemory root
    local openmemory_root=$(get_openmemory_root)
    log_info "OpenMemory-Code location: $openmemory_root"
    echo ""

    # Create work directory
    local work_dir="/tmp/openmemory-deploy-$$"
    mkdir -p "$work_dir"
    log_info "Work directory: $work_dir"
    echo ""

    # Get repositories
    local repos=$(get_repos "$username")
    echo ""

    # Process each repository
    local success=0
    local failed=0
    local skipped=0

    while IFS= read -r repo; do
        echo "───────────────────────────────────────────────────────────────────"
        if process_repo "$username" "$repo" "$openmemory_root" "$work_dir"; then
            if [ -f "$work_dir/$repo/.openmemory" ]; then
                ((skipped++))
            else
                ((success++))
            fi
        else
            ((failed++))
        fi
        echo ""
    done <<< "$repos"

    # Cleanup
    log_info "Cleaning up..."
    rm -rf "$work_dir"

    # Summary
    echo "═══════════════════════════════════════════════════════════════════"
    echo "Deployment Summary"
    echo "═══════════════════════════════════════════════════════════════════"
    echo ""
    log_success "Successfully deployed: $success repositories"
    [ $skipped -gt 0 ] && log_warning "Skipped (already set up): $skipped repositories"
    [ $failed -gt 0 ] && log_error "Failed: $failed repositories"
    echo ""

    if [ $failed -eq 0 ]; then
        log_success "All repositories processed successfully!"
        echo ""
        log_info "Next steps:"
        echo "  1. Push to any repository triggers auto-initialization"
        echo "  2. Or manually trigger workflows from Actions tab"
        echo "  3. Start OpenMemory backend: npm start"
        echo ""
    else
        log_warning "Some repositories failed - check errors above"
    fi
}

# Run main function
main "$@"
