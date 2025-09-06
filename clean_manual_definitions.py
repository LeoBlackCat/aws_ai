#!/usr/bin/env python3
"""
Clean and filter the manually extracted definitions to get proper technical terms
"""

import json
import re

def clean_definitions():
    """Clean and filter the extracted definitions"""
    
    # Load the raw definitions
    try:
        with open('definitions_manual/extracted_definitions.json', 'r', encoding='utf-8') as f:
            raw_definitions = json.load(f)
    except FileNotFoundError:
        print("✗ extracted_definitions.json not found. Run extract_definitions_manual.py first.")
        return
    
    print(f"Processing {len(raw_definitions)} raw definitions...")
    
    # Filter criteria for good technical definitions
    good_definitions = []
    
    # Keywords that indicate technical AI/ML terms
    technical_keywords = [
        'ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'dl',
        'neural', 'network', 'algorithm', 'model', 'training', 'data', 'learning',
        'generative', 'foundation', 'transformer', 'embedding', 'token', 'inference',
        'supervised', 'unsupervised', 'reinforcement', 'classification', 'regression',
        'computer vision', 'nlp', 'natural language', 'diffusion', 'gan', 'vae',
        'aws', 'amazon', 'bedrock', 'sagemaker', 'comprehend', 'rekognition', 'polly',
        'transcribe', 'translate', 'textract', 'lex', 'kendra', 'personalize'
    ]
    
    # Patterns to exclude (non-technical terms)
    exclude_patterns = [
        r'^(this|that|it|they|these|those|the|a|an)\s',
        r'^(you|we|i|he|she)\s',
        r'^(although|however|therefore|because|since)\s',
        r'^(there|here)\s',
        r'^(one of|some of|many of|most of)\s',
        r'question\s*\d+',
        r'which of the following',
        r'choose|select|answer',
        r'^\d+\.',
        r'^(if you|its |just like|understands how)',  # Additional patterns
        r'which .* approach',
    ]
    
    for definition in raw_definitions:
        term = definition['term'].strip()
        def_text = definition['definition'].strip()
        
        # Skip if term is too short or too long
        if len(term) < 2 or len(term) > 100:
            continue
            
        # Skip if definition is too short
        if len(def_text) < 15:
            continue
            
        # Check exclude patterns
        skip = False
        for pattern in exclude_patterns:
            if re.match(pattern, term, re.IGNORECASE):
                skip = True
                break
        
        if skip:
            continue
            
        # Check if it contains technical keywords
        term_lower = term.lower()
        def_lower = def_text.lower()
        
        has_technical_keyword = any(keyword in term_lower or keyword in def_lower 
                                  for keyword in technical_keywords)
        
        # Additional checks for proper technical terms
        has_def_words = any(word in def_text.lower() for word in ['is ', 'are ', 'refers to', 'involves', 'uses', 'provides', 'can ', 'that '])
        
        is_proper_term = (
            # Contains technical keywords OR looks like a technical term
            (has_technical_keyword or 
             any(word in term_lower for word in ['ai', 'ml', 'learning', 'data', 'model', 'network', 'amazon', 'aws'])) and
            # Definition looks like a proper definition (contains "is", "are", etc.)
            has_def_words
        )
        
        if is_proper_term:
            # Clean up the term name
            clean_term = re.sub(r'\n.*', '', term)  # Remove everything after newline
            clean_term = clean_term.strip()
            
            # Clean up definition
            clean_def = ' '.join(def_text.split())  # Normalize whitespace
            
            good_definitions.append({
                'term': clean_term,
                'definition': clean_def
            })
    
    # Remove duplicates based on term name (case insensitive)
    seen_terms = set()
    unique_definitions = []
    
    for definition in good_definitions:
        term_key = definition['term'].lower()
        if term_key not in seen_terms:
            seen_terms.add(term_key)
            unique_definitions.append(definition)
    
    # Sort by term name
    unique_definitions.sort(key=lambda x: x['term'].lower())
    
    print(f"\n=== CLEANED RESULTS ===")
    print(f"Filtered from {len(raw_definitions)} to {len(unique_definitions)} technical definitions")
    
    # Save cleaned definitions
    with open('definitions_manual/cleaned_definitions.json', 'w', encoding='utf-8') as f:
        json.dump(unique_definitions, f, indent=2, ensure_ascii=False)
    
    # Save just the term names
    term_names = [d['term'] for d in unique_definitions]
    with open('definitions_manual/cleaned_term_names.json', 'w', encoding='utf-8') as f:
        json.dump(term_names, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Saved to definitions_manual/cleaned_definitions.json")
    print(f"✓ Term names saved to definitions_manual/cleaned_term_names.json")
    
    print(f"\nCleaned technical terms:")
    for i, term in enumerate(term_names, 1):
        print(f"  {i:2d}. {term}")

if __name__ == "__main__":
    clean_definitions()