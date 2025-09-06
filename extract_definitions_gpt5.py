#!/usr/bin/env python3
"""
Extract definitions from fundamentals.md using GPT-5
Two-phase approach:
1. Extract list of most crucial definitions
2. Get detailed definitions for each term (prepared but not run)
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

def read_fundamentals_file():
    """Read the fundamentals.md file"""
    try:
        with open('data/fundamentals/fundamentals.md', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        raise FileNotFoundError("fundamentals.md file not found")

def extract_definition_list(client, content):
    """Phase 1: Extract list of most crucial definitions from the content"""
    
    prompt = """You are an expert in AI/ML education. Analyze the following comprehensive course material and extract the most crucial technical definitions that students need to understand.

INSTRUCTIONS:
1. Focus on TECHNICAL DEFINITIONS only - ignore general concepts, examples, or procedural descriptions
2. Extract terms that have clear, specific definitions in the text
3. Prioritize fundamental concepts that are essential for understanding AI/ML
4. Return ONLY the term names, not the definitions themselves
5. Aim for 15-25 most important terms
6. Return as a clean JSON array of strings

CONTENT:
{content}

Return only a JSON array like: ["term1", "term2", "term3", ...]"""

    try:
        print("Making API call to GPT-5...")
        response = client.chat.completions.create(
            model="gpt-5",
            messages=[
                {"role": "system", "content": "You are an expert AI/ML educator focused on identifying crucial technical definitions."},
                {"role": "user", "content": prompt.format(content=content)}
            ],
            max_completion_tokens=1000
        )
        
        print("✓ API call successful")
        content = response.choices[0].message.content
        print(f"Response length: {len(content) if content else 'None'}")
        print(f"Response preview: {repr(content[:200]) if content else 'None'}")
        return content.strip() if content else None
    
    except Exception as e:
        print(f"✗ Error calling GPT-5: {e}")
        print(f"Error type: {type(e)}")
        if hasattr(e, 'response'):
            print(f"Response: {e.response}")
        import traceback
        traceback.print_exc()
        return None

def save_results(terms_list, filename):
    """Save the extracted terms list"""
    os.makedirs('definitions_gpt5', exist_ok=True)
    
    with open(f'definitions_gpt5/{filename}', 'w', encoding='utf-8') as f:
        f.write(terms_list)
    
    print(f"Results saved to definitions_gpt5/{filename}")

def main():
    """Main execution function"""
    print("=== GPT-5 Definition Extraction - Phase 1 ===")
    print("Reading fundamentals.md...")
    
    # Initialize
    client = initialize_client()
    content = read_fundamentals_file()
    
    print(f"File loaded: {len(content)} characters")
    print("Sending to GPT-5 for definition extraction...")
    
    # Phase 1: Extract definition list
    start_time = time.time()
    terms_result = extract_definition_list(client, content)
    end_time = time.time()
    
    if terms_result:
        print(f"✓ Phase 1 completed in {end_time - start_time:.2f} seconds")
        print("Raw response:")
        print(terms_result)
        
        # Save results
        save_results(terms_result, 'terms_list_raw.json')
        
        # Try to parse as JSON to validate
        try:
            terms_array = json.loads(terms_result)
            print(f"\n✓ Successfully parsed {len(terms_array)} terms:")
            for i, term in enumerate(terms_array, 1):
                print(f"  {i}. {term}")
            
            # Save clean version
            with open('definitions_gpt5/terms_list_clean.json', 'w', encoding='utf-8') as f:
                json.dump(terms_array, f, indent=2)
            
            print(f"\n✓ Clean terms list saved to definitions_gpt5/terms_list_clean.json")
            
        except json.JSONDecodeError as e:
            print(f"⚠ JSON parsing failed: {e}")
            print("Raw response saved for manual review")
    
    else:
        print("✗ Phase 1 failed - no result returned")
        print(f"terms_result value: {repr(terms_result)}")

if __name__ == "__main__":
    main()