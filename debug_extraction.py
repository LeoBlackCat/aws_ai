#!/usr/bin/env python3
import os
import re

def extract_sections_from_file(file_path):
    """Extract H1 sections from a markdown file"""
    print(f"Reading file: {file_path}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print(f"File content length: {len(content)} characters")
        
        # Split by H1 headers (# )
        sections = re.split(r'^# (.+)$', content, flags=re.MULTILINE)
        
        print(f"Found {len(sections)} sections after split")
        
        # First element is content before first header (usually empty)
        if len(sections) <= 1:
            print("No sections found!")
            return []
        
        result = []
        for i in range(1, len(sections), 2):
            if i + 1 < len(sections):
                section_name = sections[i].strip()
                section_content = sections[i + 1].strip()
                
                print(f"Section {i//2 + 1}: '{section_name}' - {len(section_content)} chars")
                
                # Only process sections with substantial content
                if len(section_content) > 100:
                    result.append({
                        'name': section_name,
                        'content': f"# {section_name}\n\n{section_content[:500]}..."  # Limit for debug
                    })
                    print(f"  → Added to results (content: {len(section_content)} chars)")
                else:
                    print(f"  → Skipped (too short: {len(section_content)} chars)")
        
        return result
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return []

def main():
    file_path = '/Users/leo/dev/personal/aws_ai/data/fundamentals/fundamentals.md'
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
        
    print(f"Testing section extraction from: {file_path}")
    sections = extract_sections_from_file(file_path)
    
    print(f"\nFinal result: Found {len(sections)} processable sections")
    for i, section in enumerate(sections, 1):
        print(f"{i}. {section['name']}")

if __name__ == "__main__":
    main()