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
        const conditionContainer = button.parentNode;
        conditionContainer.remove();
    }

    function convertAlert() {
      const alertTimeFrame = document.getElementById('alertTimeFrame').value;
  
      // Retrieve all condition inputs
      const conditionInputs = document.querySelectorAll('#queryInputs > div');
  
      // Initialize arrays to store filter conditions
      const mustFilters = [];
      const filterConditions = [];
      const mustNotFilters = [];
  
      // Loop through each condition input
      conditionInputs.forEach((conditionInput) => {
          // Retrieve key and value of each condition
          const key = conditionInput.querySelector('input[placeholder="Key"]').value.trim();
          const value = conditionInput.querySelector('input[placeholder="Value"]').value.trim();
  
          // Construct the match_phrase object for the condition
          const matchPhrase = {
              query: value,
              slop: 0,
              zero_terms_query: "NONE",
              boost: 1
          };
  
          // Construct the match_phrase filter object
          const matchPhraseFilter = { match_phrase: { [key]: matchPhrase } };
  
          // Check if it's a must or must_not filter
          const operator = conditionInput.querySelector('select').value;
          if (operator === 'NOT') {
              mustNotFilters.push(matchPhraseFilter);
          } else {
              if (operator === 'AND') {
                  filterConditions.push(matchPhraseFilter);
              } else {
                  // If OR, push to mustFilters
                  mustFilters.push(matchPhraseFilter);
              }
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
  