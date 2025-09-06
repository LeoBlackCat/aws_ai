#!/usr/bin/env python3
"""
Manual definition extraction from fundamentals.md by parsing markdown structure
This bypasses GPT-5 issues and extracts definitions directly
"""

import re
import json
import os

def extract_definitions_manually():
    """Extract definitions by parsing markdown headers and content"""
    
    # Read the file
    try:
        with open('data/fundamentals/fundamentals.md', 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print("✗ fundamentals.md file not found")
        return
    
    definitions = []
    
    # Pattern to match H2 headers (##) followed by content that looks like a definition
    # Look for patterns like "## Term" or "## Term (Acronym)" followed by definition text
    pattern = r'^## ([^#\n]+)\n\n([^\n#]+(?:\n[^\n#]+)*?)(?=\n\n##|\n\n#[^#]|\Z)'
    
    matches = re.findall(pattern, content, re.MULTILINE | re.DOTALL)
    
    print(f"Found {len(matches)} potential definitions:")
    
    for i, (header, definition_text) in enumerate(matches, 1):
        header = header.strip()
        definition_text = definition_text.strip()
        
        # Clean up the definition text (remove extra whitespace, newlines)
        definition_text = ' '.join(definition_text.split())
        
        # Skip if it's too short to be a real definition
        if len(definition_text) < 20:
            continue
            
        # Skip if it looks like a question or instruction rather than definition
        if any(word in definition_text.lower() for word in ['question', 'which of the following', 'choose', 'select']):
            continue
        
        print(f"\n{i}. {header}")
        print(f"   Definition: {definition_text[:100]}...")
        
        definitions.append({
            "term": header,
            "definition": definition_text
        })
    
    # Also look for inline definitions in the format "Term is/are/refers to..."
    inline_pattern = r'([A-Z][A-Za-z\s\(\)]+?)\s+(?:is|are|refers?\s+to)\s+([^.]+\.)'
    inline_matches = re.findall(inline_pattern, content)
    
    print(f"\nFound {len(inline_matches)} potential inline definitions:")
    
    for i, (term, definition) in enumerate(inline_matches, 1):
        term = term.strip()
        definition = definition.strip()
        
        # Skip if term is too generic or definition too short
        if len(term) < 3 or len(definition) < 20:
            continue
            
        # Skip if it's part of a sentence rather than a definition
        if term.lower() in ['this', 'that', 'it', 'they', 'these', 'those']:
            continue
            
        print(f"\n{i}. {term}")
        print(f"   Definition: {definition}")
        
        # Check if we already have this term
        if not any(d['term'].lower() == term.lower() for d in definitions):
            definitions.append({
                "term": term,
                "definition": definition
            })
    
    # Save results
    os.makedirs('definitions_manual', exist_ok=True)
    
    with open('definitions_manual/extracted_definitions.json', 'w', encoding='utf-8') as f:
        json.dump(definitions, f, indent=2, ensure_ascii=False)
    
    # Also save just the term names
    term_names = [d['term'] for d in definitions]
    with open('definitions_manual/term_names.json', 'w', encoding='utf-8') as f:
        json.dump(term_names, f, indent=2, ensure_ascii=False)
    
    print(f"\n=== RESULTS ===")
    print(f"Extracted {len(definitions)} definitions")
    print(f"✓ Saved to definitions_manual/extracted_definitions.json")
    print(f"✓ Term names saved to definitions_manual/term_names.json")
    
    print(f"\nAll extracted terms:")
    for i, term in enumerate(term_names, 1):
        print(f"  {i}. {term}")

if __name__ == "__main__":
    extract_definitions_manually()