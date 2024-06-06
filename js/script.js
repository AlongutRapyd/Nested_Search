function convertJson() {
    const inputJson = document.getElementById('jsonInput').value.trim();
    try {
      const input_data = JSON.parse(inputJson);
  
      const must_not_phrases = input_data.query.bool.must_not.reduce((acc, filter, index) => {
        if (filter.match_phrase) {
          const prefix = index === 0 ? 'NOT' : 'AND NOT';
          Object.entries(filter.match_phrase).forEach(([key, value]) => {
            acc.push(`${prefix} ${key}: "${value}"`);
          });
        }
        return acc;
      }, []);
  
      const other_clauses = input_data.query.bool.filter.reduce((acc, filter, index) => {
        if (filter.match_phrase) {
          const prefix = acc.length === 0 && must_not_phrases.length === 0 ? '' : 'AND';
          Object.entries(filter.match_phrase).forEach(([key, value]) => {
            acc.push(`${prefix} ${key}: "${value}"`);
          });
        } else if (filter.bool && filter.bool.filter) { // Handle nested bool filter
          const nested_clauses = filter.bool.filter.reduce((nested_acc, nested_filter) => {
            if (nested_filter.multi_match && nested_filter.multi_match.query) {
              nested_acc.push(`"${nested_filter.multi_match.query}"`);
            }
            return nested_acc;
          }, []);
          if (nested_clauses.length > 0) {
            const prefix = acc.length === 0 && must_not_phrases.length === 0 ? '' : 'AND';
            acc.push(`${prefix} ${nested_clauses.join(' AND ')}`);
          }
        }
        return acc;
      }, []);
  
      const output = `${must_not_phrases.join(' ')} ${other_clauses.join(' ')}`.trim();
      document.getElementById('nestedOutput').value = output;
    } catch (error) {
      document.getElementById('nestedOutput').value = 'Invalid input!';
    }
  }
  
  
  function copyOutput(outputId) {
    var outputTextarea = document.getElementById(outputId);
    outputTextarea.select();  
    document.execCommand('copy');
}


      function handleConvertButtonClick() {
        const nestedQueryRadio = document.getElementById('nestedQueryRadio');
        const alertQueryRadio = document.getElementById('alertQueryRadio');
        const nestedJsonInputCol = document.getElementById('nestedJsonInputCol');
        const nestedOutputCol = document.getElementById('nestedOutputCol');
        
        if (nestedQueryRadio.checked) {
            // Display the nested query input fields
            nestedJsonInputCol.classList.add('col-lg-6');
            nestedOutputCol.classList.add('col-lg-6');
            nestedJsonInputCol.style.display = 'block';
            nestedOutputCol.style.display = 'block';
            document.getElementById('alertQueryInput').style.display = 'none';
        } else if (alertQueryRadio.checked) {
            // Display the alert query input fields
            nestedJsonInputCol.classList.remove('col-lg-6');
            nestedOutputCol.classList.remove('col-lg-6');
            nestedJsonInputCol.style.display = 'none';
            nestedOutputCol.style.display = 'none';
            document.getElementById('alertQueryInput').style.display = 'block';
        } else {
            // Neither radio button is selected, handle accordingly
            console.error('No query type selected');
        }
    }       

    let conditionCount = 0; // Initialize a counter for condition IDs

    function addQueryInput() {
        const queryInputs = document.getElementById('queryInputs');
        const template = document.getElementById('queryInputTemplate');
        const clone = template.content.cloneNode(true);
    
        // Increment the condition counter to generate a unique ID for the condition container
        conditionCount++;
    
        // Create a unique ID for the condition container
        const conditionId = `condition_${conditionCount}`;
    
        // Set the ID for the cloned template element
        clone.querySelector('.condition-container').id = conditionId;
    
        // Append the cloned template to the parent container
        queryInputs.appendChild(clone);
    }
    
    function removeQueryInput(button) {
      const conditionContainer = button.closest('.condition-container');
      if (conditionContainer) {
          conditionContainer.remove();
      }
  }
  
  function convertAlert() {
    const alertTimeFrameElement = document.getElementById('alertTimeFrame');
    if (!alertTimeFrameElement) {
        console.error('Alert time frame element not found.');
        return;
    }

    const alertTimeFrame = alertTimeFrameElement.value;

    // Retrieve all condition inputs
    const conditionInputs = document.querySelectorAll('#queryInputs .condition-container');

    // Initialize arrays to store filter conditions
    const mustFilters = [];
    const filterConditions = [];
    const mustNotFilters = [];

    // Loop through each condition input
    conditionInputs.forEach((conditionInput) => {
        // Retrieve key and value of each condition
        const keyInput = conditionInput.querySelector('input[placeholder="Key"]');
        const valueInput = conditionInput.querySelector('input[placeholder="Value"]');

        if (keyInput && valueInput) {
            const key = keyInput.value.trim();
            const value = valueInput.value.trim();

            // Construct the match_phrase object for the condition
            const matchPhrase = {
                query: value,
                slop: 0,
                zero_terms_query: "NONE",
                boost: 1
            };

            // Construct the match_phrase filter object
            const matchPhraseFilter = { match_phrase: { [key]: matchPhrase } };

            // Push to filterConditions array as "AND" operation
            filterConditions.push(matchPhraseFilter);
        }
    });

    // Construct the range object for the time frame
    const timeRange = {
        range: {
            time: {
                from: alertTimeFrame,
                to: "now",
                include_lower: true,
                include_upper: true,
                boost: 1
            }
        }
    };

    // Construct the query object
    const query = {
        size: 0,
        query: {
            bool: {
                must: [timeRange].concat(mustFilters),
                filter: filterConditions,
                must_not: mustNotFilters,
                adjust_pure_negative: true,
                boost: 1
            }
        }
    };

    // Convert the query object to JSON string with indentation for readability
    const outputJson = JSON.stringify(query, null, 4);

    // Display the generated query in the output textarea
    document.getElementById('alertOutput').value = outputJson;
}

function handleQueryMethodChange() {
  const conditionQuerySection = document.getElementById('conditionQuerySection');
  const jsonQuerySection = document.getElementById('jsonQuerySection');
  const conditionQueryRadio = document.getElementById('conditionQueryRadio');
  const jsonQueryRadio = document.getElementById('jsonQueryRadio');

  if (conditionQueryRadio.checked) {
      conditionQuerySection.style.display = 'block';
      jsonQuerySection.style.display = 'none';
  } else if (jsonQueryRadio.checked) {
      conditionQuerySection.style.display = 'none';
      jsonQuerySection.style.display = 'block';
  }
}

function convertJsonQuery() {
  const inputJsonStr = document.getElementById('jsonInput2').value.trim(); // Update the ID here
  const alertTimeFrame = document.getElementById('alertTimeFrame2').value;

  if (!inputJsonStr) { // Check if inputJsonStr is empty
      document.getElementById('jsonOutput2').value = "Error: Input JSON is empty."; // Update the ID here
      return;
  }

  try {
      const inputJson = JSON.parse(inputJsonStr);
      const outputJson = generateOutputJsonQuery(inputJson, alertTimeFrame); // Pass inputJson and alertTimeFrame to generateOutputJsonQuery()
      document.getElementById('jsonOutput2').value = JSON.stringify(outputJson, null, 4); // Update the ID here
  } catch (error) {
      document.getElementById('jsonOutput2').value = "Error parsing input JSON: " + error.message; // Update the ID here
  }
}

function generateOutputJsonQuery(inputJson, alertTimeFrame) {
  const outputJson = {
      size: 0,
      query: {
          bool: {
              must: [],
              filter: [],
              must_not: [],
              adjust_pure_negative: true,
              boost: 1
          }
      }
  };

  // Construct the range object for the time frame
  const timeRange = {
      range: {
          time: {
              from: alertTimeFrame,
              to: "now",
              include_lower: true,
              include_upper: true,
              boost: 1
          }
      }
  };

  // Set the time range filter
  outputJson.query.bool.must.push(timeRange);

  // Set the query from input JSON
  if (inputJson && inputJson.query) {
      const inputQuery = inputJson.query;
      if (inputQuery.bool && inputQuery.bool.filter) {
          const timeFilterIndex = inputQuery.bool.filter.findIndex(filter => filter.range && filter.range.time);
          if (timeFilterIndex !== -1) {
              inputQuery.bool.filter.splice(timeFilterIndex, 1); // Remove the time range filter
          }
          outputJson.query.bool.filter.push(inputQuery.bool.filter);
      }
  }

  return outputJson;
}


