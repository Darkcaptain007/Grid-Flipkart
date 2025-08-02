import { useState, useEffect, useRef, useContext } from 'react';
import { InputBase, List, ListItem, Typography, makeStyles, Box } from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import DOMPurify from 'dompurify';
import { LoginContext } from '../../context/ContextProvider';


const useStyle = makeStyles(theme => ({
  search: {
    borderRadius: 6,
    marginLeft: 25,
    width: '45%',
    backgroundColor: '#fff',
    display: 'flex',
    position: 'relative',
  },
  searchIcon: {
    marginLeft: 'auto',
    padding: 5,
    display: 'flex',
    color: 'blue',
    cursor: 'pointer',
  },
  inputRoot: { fontSize: 'unset', width: '100%' },
  inputInput: { paddingLeft: 20, width: '100%' },
  list: {
    position: 'absolute',
    color: '#000',
    backgroundColor: '#fff',
    marginTop: 36,
    width: '100%',
    borderRadius: '0 0 2px 2px',
    boxShadow: '0 2px 4px 0 rgb(0 0 0 / 20%)',
    maxHeight: 350,
    overflowY: 'auto',
    zIndex: 1000,
  },
  suggestionCategory: { fontWeight: 600, color: '#2874f0', paddingLeft: 12 },
  suggestionType: { fontSize: 12, color: '#666', marginLeft: 8 },
}));


const Search = () => {
  const classes = useStyle();
  const history = useHistory();
  const [text, setText] = useState('');
  const [results, setResults] = useState([]);
  const suggestionCache = useRef(new Map());
  const { account } = useContext(LoginContext);


  // This useEffect block is unchanged and works correctly.
  useEffect(() => {
    if (!text) {
      setResults([]);
      return;
    }
    const fetchSuggestions = async () => {
      if (suggestionCache.current.has(text)) {
        setResults(suggestionCache.current.get(text));
        return;
      }
      try {
        const { data } = await axios.get(
          `http://localhost:8000/autosuggest?q=${encodeURIComponent(text)}${account ? `&userId=${encodeURIComponent(account)}` : ''}`
        );
        const limitedResults = data.slice(0, 8);
        setResults(limitedResults);
        suggestionCache.current.set(text, limitedResults);
      } catch (error) {
        console.error("Autosuggest API call failed:", error);
        setResults([]);
      }
    };
    const timeoutId = setTimeout(fetchSuggestions, 400); // debounce
    return () => clearTimeout(timeoutId);
  }, [text, account]);


  // This helper function is unchanged.
  const handleTextChange = e => setText(e.target.value);
  
  // --- DEFINITIVE FIX FOR THE "ENTER" KEY BEHAVIOR ---
   const handleSearch = () => {
    const query = text.trim();
    if (!query) return;

    const topSuggestion = results?.[0];

    // If the top suggestion is a PRODUCT, extract the corrected keyword for the SEARCH,
    // but keep the user's original text for DISPLAY.
    if (topSuggestion && topSuggestion.type === 'product' && topSuggestion.title?.longTitle) {
      
      const highlightedHTML = topSuggestion.title.longTitle;
      const match = highlightedHTML.match(/<strong>(.*?)<\/strong>/i);
      const correctedKeyword = match ? match[1] : query;

      // The key change is here: `oq` is set to the user's text (`query`)
      history.push(`/search?q=${encodeURIComponent(correctedKeyword)}&oq=${encodeURIComponent(query)}`);
      
    // If the top suggestion is a category/term, the existing logic is already correct
    // because onSuggestionClick sets `oq` to the name of the suggestion.
    } else if (topSuggestion && topSuggestion.type !== 'product') {
      onSuggestionClick(topSuggestion);
    
    // Fallback: If no suggestions, search for the raw text.
    } else {
      history.push(`/search?q=${encodeURIComponent(query)}&oq=${encodeURIComponent(query)}`);
    }
    clearSearch();
  };

  const clearSearch = () => {
    setText('');
    setResults([]);
  };

  // This onSuggestionClick function is preserved exactly as it was.
  // It correctly handles MOUSE CLICKS on all suggestion types.
  const onSuggestionClick = async suggestion => {
    console.log('Suggestion clicked:', suggestion);

    if (suggestion.type === 'product') {
        if (account && suggestion.id) {
            try {
                await axios.post('http://localhost:8000/click', {
                    userId: account,
                    productId: suggestion.id
                });
                console.log('Product click tracked successfully');
            } catch (e) {
                console.error('Click tracking failed:', e.response?.data || e.message);
            }
        } else if (!account) {
            console.warn('User not logged in - Skipping click tracking');
        }
        history.push(`/product/${suggestion.id}`);
        clearSearch();
        return;
    }

    let searchTarget = '';
    let displayQuery = '';

    if (suggestion.type === 'category' || suggestion.type === 'subcategory') {
        searchTarget = suggestion.name;
        displayQuery = suggestion.name;
    } else if (suggestion.type === 'search_term') {
        searchTarget = suggestion.subcategory;
        displayQuery = suggestion.name;
    }

    if (searchTarget && account) {
        try {
            await axios.post('http://localhost:8000/click', {
                userId: account,
                category: searchTarget 
            });
            console.log(`Category/Term click tracked for: ${searchTarget}`);
        } catch (e) {
            console.error('Category/Term click tracking failed:', e);
        }
    }

    if (searchTarget) {
        history.push(`/search?q=${encodeURIComponent(searchTarget)}&oq=${encodeURIComponent(displayQuery)}`);
    }
    
    clearSearch();
  };

  // The rendering logic is preserved exactly as you provided.
  return (
    <Box className={classes.search}>
      <InputBase
        placeholder="Search for products, brands and more"
        classes={{ root: classes.inputRoot, input: classes.inputInput }}
        value={text}
        onChange={handleTextChange}
        onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
        inputProps={{ 'aria-label': 'search' }}
      />
      <Box className={classes.searchIcon} onClick={handleSearch}><SearchIcon /></Box>
      {results.length > 0 && (
        <List className={classes.list}>
          {results.map((suggestion, index) => (
            <ListItem
              button
              key={`${suggestion.type}-${suggestion.name || suggestion.id}-${index}`}
              onClick={() => onSuggestionClick(suggestion)}
            >
              {suggestion.type === 'product' ? (
                <Box>
                  <span dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(suggestion.title.longTitle)
                  }} />
                  <Typography
                    variant="body2"
                    style={{ marginLeft: 10, color: '#888', display: 'inline' }}
                  >
                    {suggestion.title.shortTitle}
                  </Typography>
                </Box>
              ) : suggestion.type === 'search_term' ? (
                <span className={classes.suggestionCategory}>
                  {suggestion.name}
                  <span className={classes.suggestionType}>in {suggestion.subcategory}</span>
                </span>
              ) : suggestion.type === 'subcategory' ? (
                <span className={classes.suggestionCategory}>
                  {suggestion.name}
                  <span className={classes.suggestionType}>in Subcategory</span>
                </span>
              ) : suggestion.type === 'category' ? (
                 <span className={classes.suggestionCategory}>
                  {suggestion.name}
                  <span className={classes.suggestionType}>in Category</span>
                </span>
              ) : null}
            </ListItem>
          ))}
          <ListItem disabled>
            <Typography variant="body2">
              View all results for "{text}"
            </Typography>
          </ListItem>
        </List>
      )}
    </Box>
  );
};


export default Search;