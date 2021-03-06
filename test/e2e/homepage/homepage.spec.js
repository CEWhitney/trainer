'use strict';

describe('homepage', function(){
  it('should get the homepage', function(){
    browser.get('/');
    expect(browser.getTitle()).toEqual('HIIT It');
    expect(element(by.css('div[ui-view] h3')).getText()).toMatch(/Working out/);
  });
});
