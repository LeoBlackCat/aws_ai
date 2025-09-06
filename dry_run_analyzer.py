#!/usr/bin/env python3
"""
Dry run analyzer for OpenAI API calls - estimates costs without making requests
"""

import re
import tiktoken
from typing import List, Dict, Tuple

class DryRunAnalyzer:
    def __init__(self):
        # OpenAI pricing (as of 2024) - update these if needed
        self.pricing = {
            'gpt-3.5-turbo': {
                'input': 0.0015 / 1000,   # $0.0015 per 1K input tokens
                'output': 0.002 / 1000    # $0.002 per 1K output tokens
            },
            'gpt-4': {
                'input': 0.03 / 1000,     # $0.03 per 1K input tokens
                'output': 0.06 / 1000     # $0.06 per 1K output tokens
            },
            'gpt-4-turbo': {
                'input': 0.01 / 1000,     # $0.01 per 1K input tokens
                'output': 0.03 / 1000     # $0.03 per 1K output tokens
            }
        }
        
        # Initialize tokenizer for GPT models
        try:
            self.encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
        except:
            self.encoding = tiktoken.get_encoding("cl100k_base")
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text using tiktoken"""
        return len(self.encoding.encode(text))
    
    def extract_sections(self, content: str) -> List[Dict]:
        """Extract sections based on headers (## and ###)"""
        sections = []
        lines = content.split('\n')
        current_section = None
        current_content = []
        
        for line in lines:
            # Check for headers
            if re.match(r'^##\s+', line):
                # Save previous section if exists
                if current_section:
                    sections.append({
                        'header': current_section,
                        'content': '\n'.join(current_content).strip(),
                        'level': 2
                    })
                
                # Start new section
                current_section = line.strip()
                current_content = []
                
            elif re.match(r'^###\s+', line):
                # Save previous section if exists
                if current_section:
                    sections.append({
                        'header': current_section,
                        'content': '\n'.join(current_content).strip(),
                        'level': 2 if current_section.startswith('##') else 3
                    })
                
                # Start new subsection
                current_section = line.strip()
                current_content = []
                
            else:
                # Add to current section content
                if current_section:
                    current_content.append(line)
        
        # Don't forget the last section
        if current_section:
            sections.append({
                'header': current_section,
                'content': '\n'.join(current_content).strip(),
                'level': 2 if current_section.startswith('##') else 3
            })
        
        return sections
    
    def create_prompt(self, section: Dict) -> str:
        """Create the structured prompt for OpenAI"""
        prompt = f"""You are analyzing AWS AI learning materials. Extract important definitions from this section.

Requirements:
- Keep original wording exactly as written
- Only extract clear, complete definitions
- Skip examples and casual mentions
- Return JSON format: {{"definitions": [{{"term": "...", "definition": "..."}}]}}

Section Header: {section['header']}
Section Content:
{section['content']}

Return definitions in JSON format with term and definition fields."""
        
        return prompt
    
    def estimate_response_tokens(self, section: Dict) -> int:
        """Estimate response tokens based on section content"""
        content_length = len(section['content'])
        
        # Rough estimation based on content length
        if content_length < 500:
            return 150  # Small section, few definitions
        elif content_length < 1500:
            return 300  # Medium section
        elif content_length < 3000:
            return 500  # Large section
        else:
            return 800  # Very large section
    
    def analyze_file(self, file_path: str) -> Dict:
        """Analyze a markdown file and estimate API costs"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            return {'error': f"Could not read file: {e}"}
        
        sections = self.extract_sections(content)
        
        analysis = {
            'file': file_path,
            'total_sections': len(sections),
            'sections': [],
            'total_input_tokens': 0,
            'total_output_tokens': 0,
            'costs': {}
        }
        
        print(f"\n📄 Analyzing: {file_path}")
        print(f"📊 Found {len(sections)} sections")
        print("\n" + "="*80)
        
        for i, section in enumerate(sections, 1):
            prompt = self.create_prompt(section)
            input_tokens = self.count_tokens(prompt)
            estimated_output_tokens = self.estimate_response_tokens(section)
            
            section_analysis = {
                'number': i,
                'header': section['header'],
                'level': section['level'],
                'content_length': len(section['content']),
                'input_tokens': input_tokens,
                'estimated_output_tokens': estimated_output_tokens
            }
            
            analysis['sections'].append(section_analysis)
            analysis['total_input_tokens'] += input_tokens
            analysis['total_output_tokens'] += estimated_output_tokens
            
            print(f"Section {i:2d}: {section['header'][:60]}...")
            print(f"           Content: {len(section['content']):4d} chars")
            print(f"           Input tokens: {input_tokens:4d}")
            print(f"           Est. output: {estimated_output_tokens:3d}")
            print()
        
        # Calculate costs for different models
        for model, prices in self.pricing.items():
            input_cost = analysis['total_input_tokens'] * prices['input']
            output_cost = analysis['total_output_tokens'] * prices['output']
            total_cost = input_cost + output_cost
            
            analysis['costs'][model] = {
                'input_cost': input_cost,
                'output_cost': output_cost,
                'total_cost': total_cost
            }
        
        return analysis
    
    def print_summary(self, analysis: Dict):
        """Print cost summary"""
        if 'error' in analysis:
            print(f"❌ Error: {analysis['error']}")
            return
        
        print("="*80)
        print("💰 COST ESTIMATION SUMMARY")
        print("="*80)
        print(f"📞 Total API calls needed: {analysis['total_sections']}")
        print(f"📥 Total input tokens: {analysis['total_input_tokens']:,}")
        print(f"📤 Total output tokens (estimated): {analysis['total_output_tokens']:,}")
        print()
        
        print("💵 Cost by Model:")
        for model, costs in analysis['costs'].items():
            print(f"  {model:15s}: ${costs['total_cost']:.4f}")
            print(f"                   (${costs['input_cost']:.4f} input + ${costs['output_cost']:.4f} output)")
        
        print()
        print("🎯 RECOMMENDATION:")
        cheapest_model = min(analysis['costs'].items(), key=lambda x: x[1]['total_cost'])
        print(f"   Use {cheapest_model[0]} - Total cost: ${cheapest_model[1]['total_cost']:.4f}")

def main():
    analyzer = DryRunAnalyzer()
    
    # Analyze fundamentals.md
    file_path = "data/fundamentals/fundamentals.md"
    analysis = analyzer.analyze_file(file_path)
    analyzer.print_summary(analysis)
    
    print("\n" + "="*80)
    print("📋 SECTION BREAKDOWN:")
    print("="*80)
    
    if 'sections' in analysis:
        for section in analysis['sections']:
            print(f"{section['number']:2d}. {section['header']}")
            print(f"    Level: {'##' if section['level'] == 2 else '###'}")
            print(f"    Content: {section['content_length']} chars")
            print(f"    Tokens: {section['input_tokens']} in → ~{section['estimated_output_tokens']} out")
            print()

if __name__ == "__main__":
    main()