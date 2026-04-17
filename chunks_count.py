import chromadb
from chromadb.utils import embedding_functions

DB_PATH = "./my_vector_db"
COLLECTION_NAME = "university_faq_collection"

client = chromadb.PersistentClient(path=DB_PATH)

print("Collections:", client.list_collections())

if client.get_collection(name=COLLECTION_NAME):
    collection = client.get_collection(name=COLLECTION_NAME)
    print("Collection exists:", COLLECTION_NAME)
    print("Total vectors:", collection.count())
    stats = collection.count()
    # # optionally, see first docs/metadata
    # sample = collection.get(include=["documents","metadatas"], limit=3)
    # print("Sample docs:", sample["documents"][0])
    # print("Sample metas:", sample["metadatas"][0])
else:
    print("Collection not found:", COLLECTION_NAME)