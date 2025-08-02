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


  // These helper functions are unchanged.
  const handleTextChange = e => setText(e.target.value);
  
  const handleSearch = () => {
    if (text.trim()) {
      const query = text.trim();
      history.push(`/search?q=${encodeURIComponent(query)}&oq=${encodeURIComponent(query)}`);
      clearSearch();
    }
  };

  const clearSearch = () => {
    setText('');
    setResults([]);
  };

  // --- MODIFIED onSuggestionClick FUNCTION ---
  // This is the updated click handler that correctly processes all suggestion types.
  const onSuggestionClick = async suggestion => {
    console.log('Suggestion clicked:', suggestion);

    // 1. Handle PRODUCT clicks
    if (suggestion.type === 'product') {
        // Track the click if the user is logged in
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
        // Always navigate to the product page
        history.push(`/product/${suggestion.id}`);
        clearSearch();
        return; // Exit function after handling product click
    }

    // 2. Handle CATEGORY, SUBCATEGORY, and SEARCH_TERM clicks
    let searchTarget = '';  // This will be the value for the 'q' parameter (for searching)
    let displayQuery = '';  // This will be the value for the 'oq' parameter (for display)

    if (suggestion.type === 'category' || suggestion.type === 'subcategory') {
        searchTarget = suggestion.name;
        displayQuery = suggestion.name;
    } else if (suggestion.type === 'search_term') {
        searchTarget = suggestion.subcategory; // CRUCIAL: Search by the underlying subcategory
        displayQuery = suggestion.name;       // Display the clicked search string
    }

    // Track the click for any of these types if the user is logged in
    if (searchTarget && account) {
        try {
            // We track the `searchTarget` which is the actual category/subcategory
            await axios.post('http://localhost:8000/click', {
                userId: account,
                category: searchTarget 
            });
            console.log(`Category/Term click tracked for: ${searchTarget}`);
        } catch (e) {
            console.error('Category/Term click tracking failed:', e);
        }
    }

    // Perform the navigation
    if (searchTarget) {
        history.push(`/search?q=${encodeURIComponent(searchTarget)}&oq=${encodeURIComponent(displayQuery)}`);
    }
    
    clearSearch();
  };

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
                // --- MODIFIED: Restored full product rendering ---
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
                // This is the rendering for our new suggestion type
                <span className={classes.suggestionCategory}>
                  {suggestion.name}
                  <span className={classes.suggestionType}>in {suggestion.subcategory}</span>
                </span>
              ) : suggestion.type === 'subcategory' ? (
                // Existing rendering for subcategory
                <span className={classes.suggestionCategory}>
                  {suggestion.name}
                  <span className={classes.suggestionType}>in Subcategory</span>
                </span>
              ) : suggestion.type === 'category' ? (
                 // Existing rendering for category
                <span className={classes.suggestionCategory}>
                  {suggestion.name}
                  <span className={classes.suggestionType}>in Category</span>
                </span>
              ) : null}
            </ListItem>
          ))}
          {/* This "View all" item is preserved */}
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