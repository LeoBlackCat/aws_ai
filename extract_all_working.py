#!/usr/bin/env python3
import os
import json
import re
import time
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
        print(f"      🤖 Calling GPT-5 API...", flush=True)
        response = client.chat.completions.create(
            model="gpt-5",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        print(f"      ✅ GPT-5 API response received", flush=True)
        
        result = response.choices[0].message.content.strip()
        
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
                print(f"    ❌ Could not parse response as JSON: {result}")
                return []
                
    except Exception as e:
        print(f"    ❌ Error calling GPT-5: {e}")
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
        print(f"❌ Error reading file {file_path}: {e}")
        return []

def main():
    # Define files to process
    files_to_process = [
        'data/fundamentals/fundamentals.md',
        'data/ai_usecases/ai_usecases.md', 
        'data/responsible_ai_practices/responsible_ai_practices.md',
        'data/developing_ml/developing_ml.md',
        'data/developing_genai/developing_genai.md',
        'data/optimizing_fm/optimizing_fm.md',
        'data/security_compliance_governance/security.md',
        'data/prompt_engineering/prompt_engineering.md'
    ]
    
    all_results = []
    total_sections = 0
    processed_sections = 0
    
    print("🚀 Starting concept extraction...", flush=True)
    
    for file_idx, file_path in enumerate(files_to_process, 1):
        full_path = f'/Users/leo/dev/personal/aws_ai/{file_path}'
        
        if not os.path.exists(full_path):
            print(f"⚠️ File not found: {full_path}")
            continue
            
        print(f"\n📄 [{file_idx}/{len(files_to_process)}] Processing: {file_path}", flush=True)
        sections = extract_sections_from_file(full_path)
        
        if not sections:
            print("   ⚠️ No sections found in this file", flush=True)
            continue
            
        print(f"   Found {len(sections)} sections", flush=True)
        total_sections += len(sections)
        
        for sect_idx, section in enumerate(sections, 1):
            print(f"   🔍 [{sect_idx}/{len(sections)}] {section['name']}...", flush=True)
            
            concepts = extract_concepts_gpt5(section['content'], file_path, section['name'])
            processed_sections += 1
            
            if concepts:
                all_results.append({
                    'file': file_path,
                    'section': section['name'],
                    'concepts': concepts,
                    'concept_count': len(concepts)
                })
                print(f"      ✅ Extracted {len(concepts)} concepts", flush=True)
            else:
                print(f"      ⚠️ No concepts extracted", flush=True)
            
            # Small delay to avoid rate limiting
            time.sleep(0.5)
    
    # Save results
    output_file = '/Users/leo/dev/personal/aws_ai/all_extracted_concepts.json'
    final_result = {
        'extraction_summary': {
            'total_files_processed': len([f for f in files_to_process if os.path.exists(f'/Users/leo/dev/personal/aws_ai/{f}')]),
            'total_sections_found': total_sections,
            'total_sections_processed': processed_sections,
            'sections_with_concepts': len(all_results),
            'total_concepts_extracted': sum(item['concept_count'] for item in all_results)
        },
        'results': all_results
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final_result, f, indent=2, ensure_ascii=False)
    
    print(f"\n🎉 Extraction complete!")
    print(f"   📊 Files processed: {final_result['extraction_summary']['total_files_processed']}")
    print(f"   📊 Sections processed: {final_result['extraction_summary']['total_sections_processed']}")
    print(f"   📊 Concepts extracted: {final_result['extraction_summary']['total_concepts_extracted']}")
    print(f"   💾 Results saved to: {output_file}")

if __name__ == "__main__":
    main()