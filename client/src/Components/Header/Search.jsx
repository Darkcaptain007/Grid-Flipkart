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


  const handleTextChange = e => setText(e.target.value);


  
const handleSearch = () => {
    if (text.trim()) {
      const query = text.trim();
      // When the user presses Enter, the search query (q) and the original query (oq)
      // should be the same: the text they typed.
      // The API will use 'q' for the search.
      // The UI will use 'oq' for the display text.
      history.push(`/search?q=${encodeURIComponent(query)}&oq=${encodeURIComponent(query)}`);
      clearSearch();
    }
  };


  const clearSearch = () => {
    setText('');
    setResults([]);
  };


  const onSuggestionClick = async suggestion => {
    console.log('Suggestion clicked:', suggestion); // Debug: Log the full suggestion object


    if (suggestion.type === 'product') {
        if (!account) {
            console.warn('User not logged in - Cannot track click');
            alert('Please log in to track clicks and get personalized suggestions');
            return;
        }
        if (!suggestion.id) {
            console.error('No product ID found in suggestion:', suggestion);
            return;
        }
        try {
            console.log(`Attempting to track product click for user: ${account}, product: ${suggestion.id}`); // Debug: Before POST
            await axios.post('http://localhost:8000/click', {
                userId: account,
                productId: suggestion.id
            });
            console.log('Product click tracked successfully'); // Debug: After successful POST
        } catch (e) {
            console.error('Click tracking failed:', e.response?.data || e.message); // Debug: Log full error
        }
        history.push(`/product/${suggestion.id}`);
    } else {
        // NEW: Track category/subcategory click
        if (account) {
            try {
                console.log(`Attempting to track category click for user: ${account}, category: ${suggestion.name}`); // Debug
                await axios.post('http://localhost:8000/click', {
                    userId: account,
                    category: suggestion.name  // Send the category/subcategory name
                });
                console.log('Category click tracked successfully');
            } catch (e) {
                console.error('Category click tracking failed:', e);
            }
        } else {
            console.warn('User not logged in - Skipping category track');
        }
        history.push(`/search?q=${encodeURIComponent(suggestion.name)}`);
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
              key={index}
              onClick={() => onSuggestionClick(suggestion)}
              style={{ cursor: 'pointer' }}
            >
              {typeof suggestion === 'string' ? (
                <Typography>{suggestion}</Typography>
              ) : suggestion.type === 'product' ? (
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
              ) : (
                <span className={classes.suggestionCategory}>
                  {suggestion.name}
                  <span className={classes.suggestionType}>
                    {suggestion.type === 'category' ? 'in Category' : 'in Subcategory'}
                  </span>
                </span>
              )}
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
