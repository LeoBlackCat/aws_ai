#!/usr/bin/env python3
"""
Phase 2: Extract detailed definitions for each term from fundamentals.md using GPT-5
This script is prepared but should only be run after reviewing Phase 1 results
"""

import os
import json
import time
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def initialize_client():
    """Initialize OpenAI client"""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in environment variables")
    return OpenAI(api_key=api_key)

def load_terms_list():
    """Load the terms list from manual extraction"""
    try:
        with open('definitions_manual/cleaned_term_names.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Error: cleaned_term_names.json not found. Run manual extraction first.")
        return None

def read_fundamentals_file():
    """Read the fundamentals.md file"""
    try:
        with open('data/fundamentals/fundamentals.md', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        raise FileNotFoundError("fundamentals.md file not found")

def extract_single_definition(client, content, term):
    """Extract detailed definition for a single term"""
    
    prompt = """You are an expert AI/ML educator. Extract the precise definition of the specified term from the course material.

INSTRUCTIONS:
1. Find the exact definition of "{term}" in the provided content
2. Use the EXACT wording from the source material - do not paraphrase
3. Include only the core definition, not examples or elaborations
4. If the term appears multiple times, use the most complete definition
5. Return as clean JSON with the term and its definition

TERM TO DEFINE: {term}

CONTENT:
{content}

Return JSON format:
{{
  "term": "{term}",
  "definition": "exact definition from the text",
  "found": true/false
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-5",
            messages=[
                {"role": "system", "content": "You are an expert at extracting precise definitions from educational content."},
                {"role": "user", "content": prompt.format(term=term, content=content)}
            ],
            max_completion_tokens=500
        )
        
        return response.choices[0].message.content.strip()
    
    except Exception as e:
        print(f"Error extracting definition for '{term}': {e}")
        return None

def main():
    """Main execution function - PREPARED BUT NOT RUN"""
    print("=== GPT-5 Definition Extraction - Phase 2 ===")
    print("⚠ This script is prepared but not executed automatically")
    print("Review Phase 1 results first, then run manually if needed")
    
    # Load terms from Phase 1
    terms = load_terms_list()
    if not terms:
        return
    
    print(f"Found {len(terms)} terms to process:")
    for i, term in enumerate(terms, 1):
        print(f"  {i}. {term}")
    
    # Ask for confirmation
    print("\n" + "="*50)
    print("TO RUN PHASE 2:")
    print("1. Review the terms list above")
    print("2. Uncomment the execution code below")
    print("3. Run this script manually")
    print("="*50)
    
    # EXECUTION CODE (COMMENTED OUT)
    """
    # Initialize
    client = initialize_client()
    content = read_fundamentals_file()
    
    print(f"\\nFile loaded: {len(content)} characters")
    print("Starting detailed definition extraction...")
    
    definitions = []
    
    for i, term in enumerate(terms, 1):
        print(f"\\nProcessing {i}/{len(terms)}: {term}")
        
        result = extract_single_definition(client, content, term)
        if result:
            try:
                definition_data = json.loads(result)
                definitions.append(definition_data)
                
                if definition_data.get('found'):
                    print(f"  ✓ Definition found")
                else:
                    print(f"  ⚠ Definition not found")
                    
            except json.JSONDecodeError:
                print(f"  ✗ JSON parsing failed for {term}")
        
        # Small delay to be respectful to API
        time.sleep(1)
    
    # Save results
    os.makedirs('definitions_gpt5', exist_ok=True)
    
    with open('definitions_gpt5/detailed_definitions.json', 'w', encoding='utf-8') as f:
        json.dump(definitions, f, indent=2, ensure_ascii=False)
    
    print(f"\\n✓ Detailed definitions saved to definitions_gpt5/detailed_definitions.json")
    print(f"Successfully processed {len([d for d in definitions if d.get('found')])} definitions")
    """

if __name__ == "__main__":
    main()