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
      document.getElementById('output').value = output;
    } catch (error) {
      document.getElementById('output').value = 'Invalid input!';
    }
  }
  
  
      function copyOutput() {
        var outputTextarea = document.getElementById('output');
        outputTextarea.select();  
        document.execCommand('copy');
      }