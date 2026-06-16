import os
import glob
import re

def fix_vite_api_url():
    # Find all JSX files in src
    search_path = os.path.join(os.getcwd(), 'src', '**', '*.jsx')
    files = glob.glob(search_path, recursive=True)
    
    modified_files = []
    
    for file_path in files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if 'import.meta.env.VITE_API_URL.replace' in content:
                # Add apiUrl fallback to the top of the component or before return statement
                # A simpler naive approach is to replace it directly with the fallback logic
                replaced_content = content.replace(
                    "import.meta.env.VITE_API_URL.replace('/api/v1', '')",
                    "(import.meta.env.VITE_API_URL || '/api/v1').replace('/api/v1', '')"
                )
                
                # Check for other patterns
                replaced_content = replaced_content.replace(
                    "import.meta.env.VITE_API_URL?",
                    "(import.meta.env.VITE_API_URL || '/api/v1')?"
                ).replace(
                    "{import.meta.env.VITE_API_URL}",
                    "{(import.meta.env.VITE_API_URL || '/api/v1')}"
                )
                
                if content != replaced_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(replaced_content)
                    modified_files.append(file_path)
                    print(f"Fixed {file_path}")
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
            
    print(f"Done. Fixed {len(modified_files)} files.")

if __name__ == "__main__":
    fix_vite_api_url()
