/**
 * Standardized AI Event Logger for InterviewAce AI
 */

const logAiEvent = ({ feature, status, rawResponse, cleanedJson, error, fallbackUsed }) => {
  console.log(`\n=================== [AI LOG: ${feature || 'Generic AI'}] ===================`);
  console.log(`Feature: ${feature || 'Generic AI'}`);
  console.log(`Status: ${status || 'PROCESSING'}`);
  
  if (rawResponse) {
    console.log(`Raw Response Length: ${rawResponse.length} chars`);
    const preview = rawResponse.length > 400 ? rawResponse.substring(0, 400) + '... [TRUNCATED]' : rawResponse;
    console.log(`Raw Response Preview:\n${preview}`);
  }
  
  if (cleanedJson) {
    const jsonStr = typeof cleanedJson === 'string' ? cleanedJson : JSON.stringify(cleanedJson, null, 2);
    const preview = jsonStr.length > 400 ? jsonStr.substring(0, 400) + '... [TRUNCATED]' : jsonStr;
    console.log(`Cleaned JSON Preview:\n${preview}`);
  }
  
  if (error) {
    console.error(`Error Details: ${error.message || error}`);
  }
  
  if (fallbackUsed) {
    console.warn(`Fallback Strategy Executed: YES`);
  }
  
  console.log(`============================================================\n`);
};

module.exports = {
  logAiEvent
};
