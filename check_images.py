#!/usr/bin/env python3
import os
import re
import glob

def check_image_links():
    """Check all image links in markdown files against existing files"""
    
    issues = []
    
    # Define the directories to check
    directories = [
        'data/fundamentals',
        'data/ai_usecases', 
        'data/responsible_ai_practices',
        'data/developing_ml',
        'data/developing_genai',
        'data/optimizing_fm',
        'data/security_compliance_governance',
        'data/prompt_engineering'
    ]
    
    for directory in directories:
        md_file = os.path.join(directory, os.path.basename(directory) + '.md')
        if directory == 'data/security_compliance_governance':
            md_file = os.path.join(directory, 'security.md')
        elif directory == 'data/prompt_engineering':
            md_file = os.path.join(directory, 'prompt_engineering.md')
            
        if not os.path.exists(md_file):
            continue
            
        print(f"\nChecking {md_file}...")
        
        # Read the markdown file
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all image references
        image_pattern = r'!\[[^\]]*\]\(([^)]+\.(png|jpg|jpeg|gif|svg))\)'
        matches = re.findall(image_pattern, content)
        
        # Get list of actual image files in the directory
        actual_images = []
        for ext in ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.svg']:
            actual_images.extend(glob.glob(os.path.join(directory, ext)))
        actual_images = [os.path.basename(f) for f in actual_images]
        
        print(f"  Found {len(matches)} image references")
        print(f"  Found {len(actual_images)} actual image files")
        
        # Check each referenced image
        for match in matches:
            image_ref = match[0]
            image_filename = os.path.basename(image_ref)
            
            if image_filename not in actual_images:
                issues.append({
                    'file': md_file,
                    'reference': image_ref,
                    'issue': 'Image file not found'
                })
                print(f"  ❌ Missing: {image_ref}")
            else:
                print(f"  ✅ Found: {image_ref}")
    
    # Check for unused images
    print(f"\n=== SUMMARY ===")
    if issues:
        print(f"Found {len(issues)} issues:")
        for issue in issues:
            print(f"  - {issue['file']}: {issue['reference']} - {issue['issue']}")
    else:
        print("✅ All image links are correct!")
    
    return issues

if __name__ == "__main__":
    check_image_links()