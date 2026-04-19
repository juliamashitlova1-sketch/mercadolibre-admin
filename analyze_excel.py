
import pandas as pd
import json

file_path = r'c:\Users\Administrator\Desktop\美客多软件\procurement_analysis.xlsx'

try:
    # Read the first 10 rows to get a sense of the data
    df = pd.read_excel(file_path, nrows=10)
    
    # Get column names
    columns = df.columns.tolist()
    
    # Get first 5 data rows as a sample
    sample_data = df.head(5).to_dict(orient='records')
    
    result = {
        "columns": columns,
        "sample": sample_data
    }
    
    with open('excel_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        
    print("Analysis complete. Saved to excel_analysis.json")
except Exception as e:
    print(f"Error: {e}")
