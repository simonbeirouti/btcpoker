#!/bin/bash

# Function to check if a file/directory should be excluded
should_exclude() {
    local path="$1"
    local relative_path="${path#./}"
    
    # Explicitly exclude .git directory
    if [[ "$relative_path" == ".git" || "$relative_path" == ".git/"* ]]; then
        return 0  # True, it should be excluded
    fi
    
    # Use git check-ignore for other files/directories
    if git check-ignore -q "$relative_path"; then
        return 0  # True, it should be excluded
    else
        return 1  # False, it should not be excluded
    fi
}

# Function to list directories and files recursively
list_recursively() {
    local dir="$1"
    local prefix="$2"

    # Check if the current directory should be excluded
    should_exclude "$dir" && return

    # Print current directory
    echo "${prefix}${dir##*/}/"

    # Loop through items in the directory
    local items=()
    while IFS= read -r -d $'\0' item; do
        items+=("$item")
    done < <(find "$dir" -mindepth 1 -maxdepth 1 -print0 | sort -z)

    local last_index=$((${#items[@]} - 1))
    for index in "${!items[@]}"; do
        item="${items[$index]}"
        # Check if the item should be excluded
        should_exclude "$item" && continue

        if [ -d "$item" ]; then
            if [ $index -eq $last_index ]; then
                list_recursively "$item" "${prefix}    "
            else
                list_recursively "$item" "${prefix}│   "
            fi
        elif [ -f "$item" ]; then
            if [ $index -eq $last_index ]; then
                echo "${prefix}└── ${item##*/}"
            else
                echo "${prefix}├── ${item##*/}"
            fi
        fi
    done
}

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "Error: This script must be run from within a git repository."
    exit 1
fi

# Start listing from the current directory and save to a file
list_recursively "." "" > project_structure.txt

echo "Detailed project structure has been saved to project_structure.txt"