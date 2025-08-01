import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import Header from './Components/Header/Header';
import TemplateProvider from './templates/TemplateProvider';
import ContextProvider from './context/ContextProvider';
import { Box, Typography } from '@material-ui/core';
import { Provider } from 'react-redux';
import store from './redux/store';

// Lazy load all major components
const Home = lazy(() => import('./Components/Home'));
const Cart = lazy(() => import('./Components/Cart/Cart'));
const DetailView = lazy(() => import('./Components/ItemDetails/DetailView'));
const SearchResultsPage = lazy(() => import('./Components/SearchResults/SearchResultsPage'));
const NotFound = lazy(() => import('./Components/NotFound'));

function App() {
  return (
    <TemplateProvider>
      <Provider store={store}>
        <ContextProvider>
          <BrowserRouter>
            <Header />
            <Box style={{ marginTop: 54 }}>
              <Suspense fallback={<Typography>Loading...</Typography>}>
                <Switch>
                  <Route exact path="/" component={Home} />
                  <Route path="/cart" component={Cart} />
                  <Route path="/product/:id" component={DetailView} />
                  <Route path="/search" component={SearchResultsPage} />
                  <Route component={NotFound} />  {/* Catch-all for 404 */}
                </Switch>
              </Suspense>
            </Box>
          </BrowserRouter>
        </ContextProvider>
      </Provider>
    </TemplateProvider>
  );
}

export default App;
