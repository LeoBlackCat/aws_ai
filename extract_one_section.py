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
        print(f"Calling GPT-5 for {file_path} - {section_name}...")
        response = client.chat.completions.create(
            model="gpt-5",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        result = response.choices[0].message.content.strip()
        print(f"✓ Got response from GPT-5 ({len(result)} chars)")
        
        # Try to parse as JSON
        try:
            concepts = json.loads(result)
            print(f"✓ Successfully parsed JSON - {len(concepts)} concepts")
            return concepts
        except json.JSONDecodeError:
            # If not valid JSON, try to extract array from text
            array_match = re.search(r'\[.*\]', result, re.DOTALL)
            if array_match:
                concepts = json.loads(array_match.group())
                print(f"✓ Extracted JSON from text - {len(concepts)} concepts")
                return concepts
            else:
                print(f"❌ Could not parse response as JSON: {result}")
                return []
                
    except Exception as e:
        print(f"❌ Error calling GPT-5: {e}")
        return []

def main():
    # Test with Introduction section
    file_path = '/Users/leo/dev/personal/aws_ai/data/fundamentals/fundamentals.md'
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        return
    
    # Extract just the Introduction section
    sections = re.split(r'^# (.+)$', content, flags=re.MULTILINE)
    
    if len(sections) > 2:
        intro_name = sections[1].strip()
        intro_content = sections[2].strip()
        
        print(f"Processing: {intro_name}")
        print(f"Content length: {len(intro_content)} chars")
        print(f"Content preview: {intro_content[:200]}...")
        
        concepts = extract_concepts_gpt5(f"# {intro_name}\n\n{intro_content}", 
                                        "fundamentals/fundamentals.md", 
                                        intro_name)
        
        if concepts:
            result = {
                'file': 'fundamentals/fundamentals.md',
                'section': intro_name,
                'concepts': concepts,
                'concept_count': len(concepts)
            }
            
            # Save result
            with open('/Users/leo/dev/personal/aws_ai/single_section_test.json', 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2)
            
            print(f"\n✅ Success! Extracted {len(concepts)} concepts:")
            for i, concept in enumerate(concepts, 1):
                print(f"  {i}. {concept}")
            
            print(f"\nSaved to single_section_test.json")
        else:
            print("❌ No concepts extracted")
    else:
        print("❌ Could not find Introduction section")

if __name__ == "__main__":
    main()