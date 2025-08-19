from fastapi import FastAPI
app = FastAPI(title="MachTrueke API")

@app.get("/")
def root():
    return {"ok": True, "msg": "MachTrueke API lista"}
