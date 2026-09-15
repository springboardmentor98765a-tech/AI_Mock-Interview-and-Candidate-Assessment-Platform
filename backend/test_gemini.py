@app.get("/test-gemini")
def test_gemini():

    try:

        result = ask_gemini(
            "Reply with exactly: GEMINI WORKS"
        )

        return {
            "success": True,
            "response": result
        }

    except Exception as e:

        return {
            "success": False,
            "error": str(e)
        }