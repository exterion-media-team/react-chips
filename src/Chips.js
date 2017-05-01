import React, { Component, PropTypes } from 'react';
import Autosuggest from 'react-autosuggest';
import Radium from 'radium';
import themeable from 'react-themeable';

import theme from './theme';
import Chip from './Chip';
import CallLimiter from './CallLimiter';

class Chips extends Component {

  constructor(props) {
    super(props)
    this.state = {
      loading: false,
      value: "",
      chipSelected: false,
      suggestions: []
    };

    this.asyncSuggestLimiter = 
      new CallLimiter(this.callFetchSuggestions.bind(this), 1000 / props.fetchSuggestionsThrushold);
  }

  componentWillReceiveProps = (nextProps) => {
    this.asyncSuggestLimiter.interval = nextProps.fetchSuggestionsThrushold;
  }
  
  onBlur = e => {
    this.refs.wrapper.focus();
  }

  onFocus = e => {
    this.refs.wrapper.blur();
  }

  handleKeyDown = e => {
    if (!this.props.fromSuggestionsOnly && (this.props.createChipKeys.includes(e.keyCode) || this.props.createChipKeys.includes(e.key))) {
      e.preventDefault();
      if (this.state.value.trim()) this.addChip(this.state.value);
    }
    if (e.keyCode === 8) {
      this.onBackspace();
    } else if (this.state.chipSelected) {
      this.setState({chipSelected: false});
    }
  }

  onBackspace = (code) => {
    if (this.state.value === "" && this.props.value.length > 0) {
      if (this.state.chipSelected) {
        const nextChips = this.props.value.slice(0, -1);
        this.setState({
          chipSelected: false,
          chips: nextChips,
        });
        this.props.onChange(nextChips);
      } else {
        this.setState({chipSelected: true})
      }
    }
  }

  addChip = (value) => {
    if (this.props.uniqueChips && this.props.value.indexOf(value) !== -1) {
      this.setState({value: ""});
      return;
    }
    let chips = [...this.props.value, value]
    this.props.onChange(chips);
    this.setState({ value: "" })
  }

  removeChip = idx => () => {
    let left = this.props.value.slice(0, idx);
    let right = this.props.value.slice(idx + 1);
    const nextChips = [...left, ...right];
    this.props.onChange(nextChips);
  }

  renderChips = () => {
    return this.props.value.map((chip, idx) => {
      return (
        React.cloneElement(this.props.renderChip(chip), {
          selected: this.state.chipSelected && idx === this.props.value.length - 1,
          onRemove: this.removeChip(idx),
          index: idx,
          key: `chip${idx}`,
        })
      );
    });
  }

  getItems = () => {
    if (this.props.uniqueChips) {
      return this.props.suggestions.filter(item => this.props.value.indexOf(this.props.getChipValue(item)) === -1);
    } else {
      return this.props.suggestions;
    }
  }

  callFetchSuggestions = (fetchSuggestions, value, canceled) => {

    let callback = suggestions => {
      if(!canceled.isCancaled()){
        this.setState({ 
          loading: false,
          suggestions
        });
      }
    }

    let suggestionResult = 
      fetchSuggestions.call(this, value, callback);

    if(suggestionResult && 'then' in suggestionResult){ // To Support Promises
      suggestionResult.then(callback);
    }
  }

  onSuggestionsFetchRequested = ({ value }) => {
    const { suggestions, fetchSuggestions, suggestionsFilter } = this.props;

    if( fetchSuggestions ){
      this.setState({loading: true});

      this.asyncSuggestLimiter.invoke(fetchSuggestions, value);
    } else {
      this.setState({
        suggestions: this.getItems().filter(opts => suggestionsFilter(opts, filterValue))
      });
    }
  }

  onSuggestionsClearRequested = () => {
    this.setState({suggestions: []})
  }

  onChange = (e, { newValue }) => {
    if (!this.props.fromSuggestionsOnly && newValue.indexOf(',') !== -1) {
      let chips = newValue.split(",").map((val) => val.trim()).filter((val) => val !== "");
      chips.forEach(chip => {
        this.addChip(chip)
      });
    } else {
      this.setState({value: newValue});
    }
  }

  render() {

    const { loading, value, suggestions } = this.state;
    const { placeholder, renderLoading } = this.props;
    const themr = themeable(this.props.theme);

    const inputProps = {
      placeholder,
      value,
      onChange: this.onChange,
      onKeyDown: this.handleKeyDown,
      onBlur: this.onBlur,
      onFocus: this.onFocus
    };

    return (
      <div {...themr(200, 'chipsContainer')} ref="wrapper" >
        {this.renderChips()}
        <Autosuggest
          {...this.props}
          theme={this.props.theme}
          suggestions={this.state.suggestions}
          onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
          onSuggestionsClearRequested={this.onSuggestionsClearRequested}
          inputProps={inputProps}
          onSuggestionSelected={(e, {suggestion}) => this.addChip(suggestion)}
        />
        { loading ? renderLoading() : null }
      </div>
    );
  }
}

Chips.propTypes = {
  value: PropTypes.array.isRequired,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  theme: PropTypes.object,
  suggestions: PropTypes.array,
  fetchSuggestions: PropTypes.func,
  fetchSuggestionsThrushold: PropTypes.number,
  fromSuggestionsOnly: PropTypes.bool,
  uniqueChips: PropTypes.bool,
  renderChip: PropTypes.func,
  suggestionsFilter: PropTypes.func,
  getChipValue: PropTypes.func,
  createChipKeys: PropTypes.array,
  getSuggestionValue: PropTypes.func,
  renderSuggestion: PropTypes.func,
  shouldRenderSuggestions: PropTypes.func,
  alwaysRenderSuggestions: PropTypes.func,
  focusFirstSuggestion: PropTypes.bool,
  focusInputOnSuggestionClick: PropTypes.bool,
  multiSection: PropTypes.bool,
  renderSectionTitle: PropTypes.func,
  getSectionSuggestions: PropTypes.func,
};

Chips.defaultProps = {
  placeholder: '',
  theme: theme,
  suggestions: [],
  fetchSuggestions: null,
  fetchSuggestionsThrushold: 10,
  createChipKeys: [9],
  fromSuggestionsOnly: false,
  uniqueChips: true,
  getSuggestionValue: s => s,
  value: [],
  onChange: () => {},
  renderChip: (value) => (<Chip>{value}</Chip>),
  renderLoading: () => (<span>Loading...</span>),
  renderSuggestion: (suggestion, { query }) => <span>{suggestion}</span>,
  suggestionsFilter: (opt, val) => opt.toLowerCase().indexOf(val.toLowerCase()) !== -1,
  getChipValue: (item) => item,
};

export default Radium(Chips);
