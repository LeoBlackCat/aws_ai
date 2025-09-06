#!/usr/bin/env python3
"""
Extract definitions from fundamentals.md using GPT-5 with chunking by H1 headers
Logs all OpenAI calls to text files
"""

import os
import json
import time
import re
from datetime import datetime
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

def log_openai_call(prompt, response, chunk_name, call_type="definition_extraction"):
    """Log OpenAI API calls to text files"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_dir = "openai_logs"
    os.makedirs(log_dir, exist_ok=True)
    
    # Log the prompt
    prompt_file = f"{log_dir}/{timestamp}_{chunk_name}_{call_type}_prompt.txt"
    with open(prompt_file, 'w', encoding='utf-8') as f:
        f.write(f"Timestamp: {datetime.now()}\n")
        f.write(f"Chunk: {chunk_name}\n")
        f.write(f"Call Type: {call_type}\n")
        f.write("="*50 + "\n")
        f.write(prompt)
    
    # Log the response
    response_file = f"{log_dir}/{timestamp}_{chunk_name}_{call_type}_response.txt"
    with open(response_file, 'w', encoding='utf-8') as f:
        f.write(f"Timestamp: {datetime.now()}\n")
        f.write(f"Chunk: {chunk_name}\n")
        f.write(f"Call Type: {call_type}\n")
        f.write("="*50 + "\n")
        f.write(str(response))
    
    print(f"  Logged to: {prompt_file} and {response_file}")

def split_by_h1_headers(content):
    """Split content by H1 headers (single #)"""
    # Split by lines starting with single # (but not ##, ###, etc.)
    chunks = []
    current_chunk = ""
    current_title = "intro"
    
    lines = content.split('\n')
    
    for line in lines:
        # Check if line starts with single # (H1 header)
        if re.match(r'^# [^#]', line):
            # Save previous chunk if it has content
            if current_chunk.strip():
                chunks.append({
                    'title': current_title,
                    'content': current_chunk.strip()
                })
            
            # Start new chunk
            current_title = line[2:].strip().lower().replace(' ', '_').replace('/', '_')
            current_chunk = line + '\n'
        else:
            current_chunk += line + '\n'
    
    # Add the last chunk
    if current_chunk.strip():
        chunks.append({
            'title': current_title,
            'content': current_chunk.strip()
        })
    
    return chunks

def extract_definitions_from_chunk(client, chunk_content, chunk_title):
    """Extract definitions from a single chunk"""
    
    # Limit content length to avoid issues with large chunks
    max_content_length = 8000
    if len(chunk_content) > max_content_length:
        print(f"  ⚠ Chunk too large ({len(chunk_content)} chars), truncating to {max_content_length}")
        chunk_content = chunk_content[:max_content_length] + "\n[Content truncated...]"
    
    prompt = f"""Find technical terms that have clear definitions in this course material. Focus on AI/ML concepts that are explicitly defined.

Return only the term names as a JSON array. If no definitions found, return [].

Course material:
{chunk_content}

Return format: ["term1", "term2", "term3"]"""

    try:
        print(f"  Making API call for chunk: {chunk_title} ({len(chunk_content)} chars)")
        
        response = client.chat.completions.create(
            model="gpt-5",
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_completion_tokens=500
        )
        
        # Debug the response object
        print(f"  Response object: {type(response)}")
        print(f"  Choices: {len(response.choices) if response.choices else 'None'}")
        
        if response.choices and len(response.choices) > 0:
            message = response.choices[0].message
            print(f"  Message object: {type(message)}")
            print(f"  Message content type: {type(message.content)}")
            content = message.content
        else:
            print(f"  ⚠ No choices in response")
            content = None
        
        # Log the call
        log_openai_call(prompt, content, chunk_title)
        
        print(f"  Response length: {len(content) if content else 'None'}")
        print(f"  Response preview: {repr(content[:100]) if content else 'None'}")
        
        if content and content.strip():
            return content.strip()
        else:
            print(f"  ⚠ Empty response for chunk: {chunk_title}")
            return None
    
    except Exception as e:
        print(f"  ✗ Error processing chunk {chunk_title}: {e}")
        # Log the error
        log_openai_call(prompt, f"ERROR: {e}", chunk_title, "error")
        return None

def main():
    """Main execution function"""
    print("=== GPT-5 Definition Extraction - Chunked by H1 Headers ===")
    
    # Read and split content
    print("Reading and splitting fundamentals.md...")
    try:
        with open('data/fundamentals/fundamentals.md', 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print("✗ fundamentals.md file not found")
        return
    
    chunks = split_by_h1_headers(content)
    print(f"Split into {len(chunks)} chunks:")
    for i, chunk in enumerate(chunks, 1):
        print(f"  {i}. {chunk['title']} ({len(chunk['content'])} chars)")
    
    # Initialize client
    client = initialize_client()
    
    # Process each chunk
    all_terms = []
    successful_chunks = 0
    
    print(f"\nProcessing {len(chunks)} chunks...")
    
    for i, chunk in enumerate(chunks, 1):
        print(f"\n[{i}/{len(chunks)}] Processing: {chunk['title']}")
        
        result = extract_definitions_from_chunk(client, chunk['content'], chunk['title'])
        
        if result:
            try:
                terms = json.loads(result)
                if terms:  # Only add if not empty
                    all_terms.extend(terms)
                    print(f"  ✓ Found {len(terms)} terms: {terms}")
                    successful_chunks += 1
                else:
                    print(f"  - No terms found in this chunk")
            except json.JSONDecodeError as e:
                print(f"  ⚠ JSON parsing failed: {e}")
                print(f"  Raw response: {result}")
        
        # Small delay between calls
        time.sleep(1)
    
    # Save results
    print(f"\n=== RESULTS ===")
    print(f"Processed {successful_chunks}/{len(chunks)} chunks successfully")
    print(f"Total terms found: {len(all_terms)}")
    
    if all_terms:
        # Remove duplicates while preserving order
        unique_terms = []
        seen = set()
        for term in all_terms:
            if term not in seen:
                unique_terms.append(term)
                seen.add(term)
        
        print(f"Unique terms: {len(unique_terms)}")
        for i, term in enumerate(unique_terms, 1):
            print(f"  {i}. {term}")
        
        # Save results
        os.makedirs('definitions_gpt5', exist_ok=True)
        
        with open('definitions_gpt5/chunked_terms_all.json', 'w', encoding='utf-8') as f:
            json.dump(all_terms, f, indent=2)
        
        with open('definitions_gpt5/chunked_terms_unique.json', 'w', encoding='utf-8') as f:
            json.dump(unique_terms, f, indent=2)
        
        print(f"\n✓ Results saved to definitions_gpt5/")
        print(f"✓ All OpenAI calls logged to openai_logs/")
    
    else:
        print("✗ No terms extracted from any chunks")

if __name__ == "__main__":
    main()