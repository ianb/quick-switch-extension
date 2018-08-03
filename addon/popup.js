async function init() {
  let result = await browser.runtime.sendMessage({
    type: "requestScreenshot"
  });
  console.log("got done", result.url.substr(0, 20));
  document.querySelector("img").src = result.url;
}

init();
