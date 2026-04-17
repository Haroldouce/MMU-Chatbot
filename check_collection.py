import os
import chromadb

os.chdir(r'C:\Users\Harold goh\Downloads\ebc-hat')
client = chromadb.PersistentClient(path='./my_vector_db')
collection_names = [c.name for c in client.list_collections()]
print('collections:', collection_names)
if 'university_faq_collection' in collection_names:
    col = client.get_collection(name='university_faq_collection')
    print('count:', col.count())
    try:
        existing = col.get(where={'source': 'MMU-Scholarships-Financial-Aid-QA-v1.0'})
        print('existing get:', existing)
    except Exception as e:
        print('get where error:', e)
    try:
        q = col.query(query_texts=['test'], n_results=1)
        print('query result:', q)
    except Exception as e:
        print('query error:', e)