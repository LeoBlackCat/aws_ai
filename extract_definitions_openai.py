#!/usr/bin/env python3
"""
Extract definitions from AWS AI Practitioner markdown files using OpenAI API
Uses GPT-5 nano for cost-effective definition extraction with exact wording preservation
"""

import os
import re
import json
import tiktoken
from typing import List, Dict
from dotenv import load_dotenv
from openai import OpenAI

class OpenAIDefinitionExtractor:
    def __init__(self):
        # Load environment variables
        load_dotenv()
        
        # Initialize OpenAI client
        self.api_key = os.getenv('OPENAI_API_KEY')
        if not self.api_key or self.api_key == 'your-api-key-here':
            raise ValueError("Please set your OpenAI API key in the .env file")
        
        self.client = OpenAI(api_key=self.api_key)
        self.model = os.getenv('OPENAI_MODEL', 'gpt-5-nano')
        
        # Initialize tokenizer for cost calculation
        try:
            self.encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")  # Use gpt-3.5 encoding as fallback
        except:
            self.encoding = tiktoken.get_encoding("cl100k_base")
        
        # GPT-5 mini pricing
        self.pricing = {
            'input': 0.250 / 1000000,   # $0.250 per 1M tokens
            'output': 2.000 / 1000000   # $2.000 per 1M tokens
        }
        
        self.total_cost = 0.0
        self.total_calls = 0
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.failed_sections = []

    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        return len(self.encoding.encode(text))

    def extract_sections(self, content: str) -> List[Dict]:
        """Extract ## and ### level sections, skip questions"""
        sections = []
        lines = content.split('\n')
        current_section = None
        current_content = []
        
        for line in lines:
            # Process both ## and ### headers
            if re.match(r'^##\s+', line) or re.match(r'^###\s+', line):
                # Save previous section if exists and not a question
                if current_section and not self.is_question_section(current_section):
                    sections.append({
                        'header': current_section,
                        'content': '\n'.join(current_content).strip()
                    })
                
                # Start new section
                current_section = line.strip()
                current_content = []
                
            else:
                # Add to current section content
                if current_section:
                    current_content.append(line)
        
        # Don't forget the last section
        if current_section and not self.is_question_section(current_section):
            sections.append({
                'header': current_section,
                'content': '\n'.join(current_content).strip()
            })
        
        return sections

    def is_question_section(self, header: str) -> bool:
        """Check if section is a question/knowledge check section"""
        question_keywords = ['question', 'knowledge check', 'quiz', 'test', 'assessment']
        header_lower = header.lower()
        return any(keyword in header_lower for keyword in question_keywords)

    def create_prompt(self, section: Dict) -> str:
        """Create the structured prompt for OpenAI with exact wording requirements"""
        prompt = f"""Extract key technical definitions from this AWS AI section. 

REQUIREMENTS:
- Keep original wording EXACTLY as written
- Extract complete definitions only
- Return ONLY valid JSON in this EXACT format:

{{"definitions": [{{"term": "Term Name", "definition": "Exact definition from text"}}]}}

Section: {section['header']}
Content: {section['content']}

Return ONLY the JSON object, no other text or formatting."""
        
        return prompt

    def extract_definitions_from_section(self, section: Dict, source_file: str, max_attempts: int = 3) -> List[Dict]:
        """Extract definitions from a single section using OpenAI API with retry on JSON errors"""
        prompt = self.create_prompt(section)
        input_tokens = self.count_tokens(prompt)
        
        print(f"  Processing: {section['header'][:60]}...")
        print(f"    Input tokens: {input_tokens}")
        
        for attempt in range(max_attempts):
            try:
                if attempt > 0:
                    print(f"    🔄 Retry attempt {attempt + 1}/{max_attempts}")
                
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are an expert at extracting technical definitions. You MUST return valid JSON in the exact format requested."},
                        {"role": "user", "content": prompt}
                    ],
                    max_completion_tokens=1000
                )
                
                # Calculate costs
                output_tokens = response.usage.completion_tokens
                input_cost = input_tokens * self.pricing['input']
                output_cost = output_tokens * self.pricing['output']
                section_cost = input_cost + output_cost
                
                self.total_calls += 1
                self.total_input_tokens += input_tokens
                self.total_output_tokens += output_tokens
                self.total_cost += section_cost
                
                print(f"    Output tokens: {output_tokens}")
                print(f"    Cost: ${section_cost:.6f}")
                
                # Parse JSON response
                response_text = response.choices[0].message.content.strip()
                
                # Clean up response - handle various markdown formats
                if '```json' in response_text:
                    json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
                    if json_match:
                        response_text = json_match.group(1).strip()
                    else:
                        response_text = response_text.replace('```json', '').replace('```', '').strip()
                
                # Try to find JSON object if response has extra text
                if not response_text.startswith('{'):
                    json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                    if json_match:
                        response_text = json_match.group(0)
                
                # Attempt to parse JSON
                definitions_data = json.loads(response_text)
                definitions = definitions_data.get('definitions', [])
                
                # Add source information
                for definition in definitions:
                    definition['source_file'] = source_file
                    definition['section'] = section['header']
                
                print(f"    ✅ Extracted: {len(definitions)} definitions")
                return definitions
                
            except json.JSONDecodeError as e:
                print(f"    ❌ JSON parsing error (attempt {attempt + 1}): {e}")
                if attempt < max_attempts - 1:
                    print(f"    🔄 Retrying with new API call...")
                    continue
                else:
                    print(f"    💥 Failed after {max_attempts} attempts")
                    print(f"    Response: {response_text[:200]}...")
                    self.failed_sections.append(section)
                    return []
                    
            except Exception as e:
                print(f"    ❌ API error: {e}")
                if attempt < max_attempts - 1:
                    print(f"    🔄 Retrying API call...")
                    continue
                else:
                    print("    🛑 Stopping execution due to persistent API error")
                    raise e

    def retry_failed_sections(self, source_file: str) -> List[Dict]:
        """Retry processing failed sections with improved prompt"""
        if not self.failed_sections:
            return []
        
        print(f"\n🔄 Retrying {len(self.failed_sections)} failed sections...")
        retry_definitions = []
        
        for section in self.failed_sections[:]:  # Copy list to modify during iteration
            print(f"  Retrying: {section['header'][:60]}...")
            
            # Use a simpler, more explicit prompt for retry
            retry_prompt = f"""Extract key definitions from this AWS AI section. Return ONLY valid JSON in this exact format:
{{"definitions": [{{"term": "Term Name", "definition": "Exact definition text"}}]}}

Section: {section['header']}
Content: {section['content'][:1000]}...

Return only the JSON object, no other text."""
            
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a JSON extraction expert. Return only valid JSON."},
                        {"role": "user", "content": retry_prompt}
                    ],
                    max_completion_tokens=800
                )
                
                response_text = response.choices[0].message.content.strip()
                
                # More aggressive JSON extraction
                if not response_text.startswith('{'):
                    json_match = re.search(r'\{[^{}]*"definitions"[^{}]*\[[^\]]*\][^{}]*\}', response_text, re.DOTALL)
                    if json_match:
                        response_text = json_match.group(0)
                
                definitions_data = json.loads(response_text)
                definitions = definitions_data.get('definitions', [])
                
                # Add source information
                for definition in definitions:
                    definition['source_file'] = source_file
                    definition['section'] = section['header']
                
                retry_definitions.extend(definitions)
                self.failed_sections.remove(section)  # Remove from failed list
                print(f"    ✅ Retry successful: {len(definitions)} definitions")
                
            except Exception as e:
                print(f"    ❌ Retry failed: {e}")
        
        return retry_definitions

    def process_file(self, file_path: str) -> List[Dict]:
        """Process a single markdown file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"❌ Error reading {file_path}: {e}")
            return []
        
        source_file = os.path.basename(file_path)
        sections = self.extract_sections(content)
        
        print(f"\n📄 Processing: {file_path}")
        print(f"📊 Found {len(sections)} sections (## and ### level, no questions)")
        
        all_definitions = []
        
        # First pass - process all sections
        for section in sections:
            definitions = self.extract_definitions_from_section(section, source_file)
            all_definitions.extend(definitions)
        
        # Second pass - retry failed sections (disabled for now)
        # retry_definitions = self.retry_failed_sections(source_file)
        # all_definitions.extend(retry_definitions)
        
        if self.failed_sections:
            print(f"\n⚠️  {len(self.failed_sections)} sections failed JSON parsing (skipping retry for now)")
        
        return all_definitions

    def process_fundamentals_only(self, data_dir: str = "data") -> Dict[str, List[Dict]]:
        """Process only fundamentals.md file"""
        all_definitions = {}
        
        file_path = os.path.join(data_dir, 'fundamentals', 'fundamentals.md')
        if os.path.exists(file_path):
            definitions = self.process_file(file_path)
            if definitions:
                all_definitions['fundamentals'] = definitions
        else:
            print(f"⚠️  File not found: {file_path}")
        
        return all_definitions

    def save_definitions(self, definitions: Dict[str, List[Dict]], output_dir: str = "definitions_openai"):
        """Save definitions to various formats"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save as JSON
        json_file = os.path.join(output_dir, "definitions_openai.json")
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(definitions, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Saved JSON to: {json_file}")
        
        # Save as markdown
        md_file = os.path.join(output_dir, "definitions_openai.md")
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write("# AWS AI Practitioner - Key Definitions (OpenAI Extracted)\n\n")
            f.write(f"*Extracted using {self.model} with exact wording preservation*\n\n")
            
            for category, defs in definitions.items():
                f.write(f"## {category.replace('_', ' ').title()}\n\n")
                
                for definition in defs:
                    f.write(f"### {definition['term']}\n\n")
                    f.write(f"{definition['definition']}\n\n")
                    f.write(f"*Source: {definition['source_file']} - {definition['section']}*\n\n")
                    f.write("---\n\n")
        
        print(f"💾 Saved Markdown to: {md_file}")
        
        # Save cost summary
        cost_file = os.path.join(output_dir, "cost_summary.txt")
        with open(cost_file, 'w', encoding='utf-8') as f:
            f.write("AWS AI Practitioner Definition Extraction - Cost Summary\n")
            f.write("=" * 60 + "\n\n")
            f.write(f"Model Used: {self.model}\n")
            f.write(f"Total API Calls: {self.total_calls}\n")
            f.write(f"Total Input Tokens: {self.total_input_tokens:,}\n")
            f.write(f"Total Output Tokens: {self.total_output_tokens:,}\n")
            f.write(f"Total Cost: ${self.total_cost:.6f}\n\n")
            
            total_definitions = sum(len(defs) for defs in definitions.values())
            f.write(f"Total Definitions Extracted: {total_definitions}\n")
            f.write(f"Cost per Definition: ${self.total_cost/total_definitions:.6f}\n")
        
        print(f"💾 Saved cost summary to: {cost_file}")

    def print_summary(self):
        """Print extraction summary"""
        print("\n" + "="*80)
        print("💰 EXTRACTION SUMMARY")
        print("="*80)
        print(f"🤖 Model: {self.model}")
        print(f"📞 Total API calls: {self.total_calls}")
        print(f"📥 Total input tokens: {self.total_input_tokens:,}")
        print(f"📤 Total output tokens: {self.total_output_tokens:,}")
        print(f"💵 Total cost: ${self.total_cost:.6f}")

def main():
    try:
        extractor = OpenAIDefinitionExtractor()
        
        print("🚀 Starting OpenAI-powered definition extraction...")
        print(f"🤖 Using model: {extractor.model}")
        print("📋 Processing ## and ### level sections, skipping questions")
        print("🎯 Preserving exact original wording")
        
        # Process only fundamentals.md
        definitions = extractor.process_fundamentals_only()
        
        if definitions:
            total_definitions = sum(len(defs) for defs in definitions.values())
            print(f"\n✅ Successfully extracted {total_definitions} definitions from {len(definitions)} files")
            
            # Save results
            extractor.save_definitions(definitions)
            extractor.print_summary()
            
            print(f"\n🎉 Definition extraction complete!")
            print(f"💡 Average cost per definition: ${extractor.total_cost/total_definitions:.6f}")
        else:
            print("\n❌ No definitions extracted!")
            
    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        print("💡 Please add your OpenAI API key to the .env file")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()