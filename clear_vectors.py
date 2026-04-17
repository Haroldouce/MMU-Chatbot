import chromadb
from chromadb.utils import embedding_functions

# Config (same as in rag_api.py)
DB_PATH = "./my_vector_db"
COLLECTION_NAME = "university_faq_collection"

embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

client = chromadb.PersistentClient(path=DB_PATH)

# Delete the collection if it exists
try:
    client.delete_collection(name=COLLECTION_NAME)
    print(f"✅ Collection '{COLLECTION_NAME}' deleted successfully.")
except Exception as e:
    print(f"⚠️ Collection '{COLLECTION_NAME}' not found or error deleting: {e}")

# Recreate the collection (empty)
collection = client.get_or_create_collection(
    name=COLLECTION_NAME,
    embedding_function=embedding_function
)

print(f"✅ Empty collection '{COLLECTION_NAME}' recreated.")
print(f"Total vectors now: {collection.count()}")