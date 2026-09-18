#!/bin/bash

# ==============================================================================
# Universal Semver Bump Script
# Supports: package.json (Node), pyproject.toml (Python), VERSION (Plain Text)
# Usage: ./bump-version.sh [major|minor|patch]
# ==============================================================================

TYPE=${1:-patch}
PROJECT_ROOT=$(pwd)

# Function to update package.json (Node.js)
bump_node() {
    local file="$PROJECT_ROOT/package.json"
    if [ ! -f "$file" ]; then return 1; fi
    
    echo "Bumping Node.js version ($TYPE)..."
    # Use npm version to handle the complex JSON update without jq
    npm version "$TYPE" --no-git-tag-version > /dev/null
    
    # Also update any src/App.tsx version strings if they exist (AA2 specific but safe)
    local app_tsx="$PROJECT_ROOT/src/App.tsx"
    if [ -f "$app_tsx" ]; then
        local new_version=$(node -p "require('./package.json').version")
        local today=$(date +%Y-%m-%d)
        # Use extended regex (-E) for + support
        local regex="v[0-9]+\.[0-9]+\.[0-9]+-debug \| [0-9]{4}-[0-9]{2}-[0-9]{2}"
        sed -i '' -E "s/$regex/v$new_version-debug | $today/g" "$app_tsx"
    fi
}

# Function to update pyproject.toml (Python)
bump_python() {
    local file="$PROJECT_ROOT/pyproject.toml"
    if [ ! -f "$file" ]; then return 1; fi
    
    echo "Bumping Python version ($TYPE)..."
    # Basic sed update for pyproject [project] or [tool.poetry] section
    local old_version=$(grep -m 1 "version =" "$file" | cut -d '"' -f 2)
    IFS='.' read -ra ADDR <<< "$old_version"
    local major=${ADDR[0]}
    local minor=${ADDR[1]}
    local patch=${ADDR[2]}

    case "$TYPE" in
        major) major=$((major + 1)); minor=0; patch=0 ;;
        minor) minor=$((minor + 1)); patch=0 ;;
        patch) patch=$((patch + 1)) ;;
    esac
    local new_version="$major.$minor.$patch"
    sed -i '' "s/version = \"$old_version\"/version = \"$new_version\"/" "$file"
}

# Function for Plain Text VERSION file fallback
bump_text() {
    local file="$PROJECT_ROOT/VERSION"
    if [ ! -f "$file" ]; then 
        echo "0.0.0" > "$file"
    fi
    
    local old_version=$(cat "$file")
    IFS='.' read -ra ADDR <<< "$old_version"
    local major=${ADDR[0]}
    local minor=${ADDR[1]}
    local patch=${ADDR[2]}

    case "$TYPE" in
        major) major=$((major + 1)); minor=0; patch=0 ;;
        minor) minor=$((minor + 1)); patch=0 ;;
        patch) patch=$((patch + 1)) ;;
    esac
    local new_version="$major.$minor.$patch"
    echo "$new_version" > "$file"
    echo "Updated VERSION: $old_version -> $new_version"
}

# Main Execution Switch
if [ -f "$PROJECT_ROOT/package.json" ]; then
    bump_node
elif [ -f "$PROJECT_ROOT/pyproject.toml" ]; then
    bump_python
else
    bump_text
fi
