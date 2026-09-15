from llm_service import analyze_resume_with_llm


resume_text = """
Nakshatra is a Computer Science student specializing in
Data Science.

Skills:
Python, Pandas, NumPy, Matplotlib, Scikit-learn,
Machine Learning.

Projects:
Fake News Detection using Python and Machine Learning.
Parkinson's Disease Prediction using Machine Learning.

Education:
B.Tech in Computer Science (Data Science).
"""


result = analyze_resume_with_llm(resume_text)

print("\n========== AI RESUME ANALYSIS ==========\n")

print(result)