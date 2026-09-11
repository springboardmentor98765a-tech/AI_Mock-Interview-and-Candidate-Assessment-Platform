import React, { useState } from 'react';
import { mlApi } from '../services/mlapi';  // Make sure this matches the file name

const MLTest = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testPrediction = async () => {
    setLoading(true);
    try {
      const features = mlApi.getSampleFeatures();
      const prediction = await mlApi.predictConfidence(features);
      setResult(prediction);
      console.log('Prediction result:', prediction);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', margin: '16px 0' }}>
     
      
      {result && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#f0fdf4', borderRadius: '8px' }}>
          <h4>📊 Result:</h4>
          <p><strong>Confidence Level:</strong> {result.class}</p>
          <p><strong>Confidence Score:</strong> {result.confidence}%</p>
          <p><strong>Probabilities:</strong></p>
          <ul>
            {result.probabilities && Object.entries(result.probabilities).map(([key, value]) => (
              <li key={key}>{key}: {(value * 100).toFixed(1)}%</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MLTest;