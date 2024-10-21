const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

import api from './api.cjs';
import questionsData from './questions.json';

export const getQuestionsByType = async (type, value) => {
  try {
    // In a real-world scenario, you'd make an API call here
    // For now, we'll simulate an API call by filtering the local JSON data
    const response = await new Promise((resolve) => {
      setTimeout(() => {
        const filteredQuestions = questionsData.filter(
          (q) => q.type === type && q.value === value
        );
        resolve({ data: filteredQuestions });
      }, 300); // Simulate network delay
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};

export const submitAnswer = async (questionId, answer) => {
  try {
    const response = await api.post('/submit-answer', { questionId, answer });
    return response.data;
  } catch (error) {
    console.error('Error submitting answer:', error);
    throw error;
  }
};

export const getQuestionStats = async (questionId) => {
  try {
    const response = await api.get(`/question-stats/${questionId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching question stats:', error);
    throw error;
  }
};