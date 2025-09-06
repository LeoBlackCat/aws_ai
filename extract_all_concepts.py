#!/usr/bin/env python3
import os
import json
import re
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def extract_concepts_gpt5(content, file_path, section_name):
    """Extract key concepts and technical definitions using GPT-5"""
    
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    prompt = f"""You are an expert in AI/ML education. Analyze the following comprehensive course material and extract the most crucial general concepts and technical definitions that students need to understand.

INSTRUCTIONS:
1. Focus on GENERAL CONCEPTS AND TECHNICAL DEFINITIONS only - ignore examples, or procedural descriptions
2. Extract terms that have clear, specific definitions in the text
3. Prioritize fundamental concepts that are essential for understanding AI/ML
4. Return ONLY the term names, not the definitions themselves
5. Aim for ~10 most important terms
6. Return as a clean JSON array of strings

CONTENT:
{content}

Return only a JSON array like: ["term1", "term2", "term3", ...]"""

    try:
        response = client.chat.completions.create(
            model="gpt-5",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        result = response.choices[0].message.content.strip()
        print(f"✓ Processing {file_path} - {section_name}...")
        
        # Try to parse as JSON
        try:
            concepts = json.loads(result)
            return concepts
        except json.JSONDecodeError:
            # If not valid JSON, try to extract array from text
            array_match = re.search(r'\[.*\]', result, re.DOTALL)
            if array_match:
                return json.loads(array_match.group())
            else:
                print(f"Could not parse response as JSON for {file_path} - {section_name}: {result}")
                return []
                
    except Exception as e:
        print(f"Error calling GPT-5 for {file_path} - {section_name}: {e}")
        return []

def extract_sections_from_file(file_path):
    """Extract H1 sections from a markdown file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Split by H1 headers (# )
        sections = re.split(r'^# (.+)$', content, flags=re.MULTILINE)
        
        # First element is content before first header (usually empty)
        if len(sections) <= 1:
            return []
        
        result = []
        for i in range(1, len(sections), 2):
            if i + 1 < len(sections):
                section_name = sections[i].strip()
                section_content = sections[i + 1].strip()
                
                # Only process sections with substantial content
                if len(section_content) > 100:
                    result.append({
                        'name': section_name,
                        'content': f"# {section_name}\n\n{section_content}"
                    })
        
        return result
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return []

def main():
    # Define the files to process based on our structure  
    # Start with just one file for testing
    files_to_process = [
        'data/fundamentals/fundamentals.md',
        # 'data/ai_usecases/ai_usecases.md', 
        # 'data/responsible_ai_practices/responsible_ai_practices.md',
        # 'data/developing_ml/developing_ml.md',
        # 'data/developing_genai/developing_genai.md',
        # 'data/optimizing_fm/optimizing_fm.md',
        # 'data/security_compliance_governance/security.md',
        # 'data/prompt_engineering/prompt_engineering.md'
    ]
    
    print(f"Starting extraction for {len(files_to_process)} files...")
    
    all_results = []
    
    for file_path in files_to_process:
        full_path = f'/Users/leo/dev/personal/aws_ai/{file_path}'
        
        if not os.path.exists(full_path):
            print(f"File not found: {full_path}")
            continue
            
        print(f"\n📄 Processing file: {file_path}")
        sections = extract_sections_from_file(full_path)
        print(f"   Found {len(sections)} sections in {file_path}")
        
        for i, section in enumerate(sections, 1):
            print(f"  🔍 [{i}/{len(sections)}] Extracting concepts from section: {section['name']}")
            concepts = extract_concepts_gpt5(section['content'], file_path, section['name'])
            
            if concepts:
                all_results.append({
                    'file': file_path,
                    'section': section['name'],
                    'concepts': concepts,
                    'concept_count': len(concepts)
                })
                print(f"    → Extracted {len(concepts)} concepts")
            else:
                print(f"    → No concepts extracted")
    
    # Save all results to a single JSON file
    output_file = '/Users/leo/dev/personal/aws_ai/all_extracted_concepts.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'total_sections': len(all_results),
            'total_concepts': sum(item['concept_count'] for item in all_results),
            'results': all_results
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Extraction complete!")
    print(f"   Total sections processed: {len(all_results)}")
    print(f"   Total concepts extracted: {sum(item['concept_count'] for item in all_results)}")
    print(f"   Results saved to: {output_file}")

if __name__ == "__main__":
    main()