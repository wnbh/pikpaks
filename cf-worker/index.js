addEventListener('fetch', event => {
  event.passThroughOnException()

  event.respondWith(handleRequest(event))
})

/**
* Respond to the request
* @param {Request} request
*/
async function handleRequest(event) {
  const { request } = event;

  //请求头部、返回对象
  let reqHeaders = new Headers(request.headers),
      outBody, outStatus = 200, outStatusText = 'OK', outCt = null, outHeaders = new Headers({
          "Access-Control-Allow-Origin": reqHeaders.get('Origin') || '*',
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": reqHeaders.get('Access-Control-Allow-Headers') || "Accept, Authorization, Cache-Control, Content-Type, DNT, If-Modified-Since, Keep-Alive, Origin, User-Agent, X-Requested-With, Token, x-access-token, Notion-Version, X-Captcha-Token, x-captcha-token",
          "Vary": "Origin"
      });

  try {
      //取域名第一个斜杠后的所有信息为代理链接
      let url = request.url.substr(8);
      url = decodeURIComponent(url.substr(url.indexOf('/') + 1));

      // 预检请求（OPTIONS）：直接返回 CORS 放行头。
      // 关键：回显浏览器请求的 Access-Control-Request-Headers，
      // 这样登录接口携带的 X-Captcha-Token 等自定义头也能通过预检。
      if (request.method == "OPTIONS") {
          const reqOrigin = reqHeaders.get('Origin') || '*';
          const reqAllowHeaders = reqHeaders.get('Access-Control-Request-Headers') ||
              "Accept, Authorization, Cache-Control, Content-Type, DNT, If-Modified-Since, Keep-Alive, Origin, User-Agent, X-Requested-With, Token, x-access-token, Notion-Version, X-Captcha-Token, x-captcha-token";
          const reqMethod = reqHeaders.get('Access-Control-Request-Method') || 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
          return new Response(null, {
              status: 204,
              headers: {
                  "Access-Control-Allow-Origin": reqOrigin,
                  "Access-Control-Allow-Methods": reqMethod,
                  "Access-Control-Allow-Headers": reqAllowHeaders,
                  "Access-Control-Max-Age": "86400",
                  "Vary": "Origin, Access-Control-Request-Headers, Access-Control-Request-Method"
              }
          })
      }
      else if(url.length < 3 || url.indexOf('.') == -1 || url == "favicon.ico" || url == "robots.txt") {
          return Response.redirect('https://baidu.com', 301)
      }
      //阻断
      else if (blocker.check(url)) {
          return Response.redirect('https://baidu.com', 301)
      }
      else {
          //补上前缀 http://
          url = url.replace(/https:(\/)*/,'https://').replace(/http:(\/)*/, 'http://')
          if (url.indexOf("://") == -1) {
              url = "http://" + url;
          }
          //构建 fetch 参数
          let fp = {
              method: request.method,
              headers: {}
          }

          //保留头部其它信息
          let he = reqHeaders.entries();
          for (let h of he) {
              if (!['content-length'].includes(h[0])) {
                  fp.headers[h[0]] = h[1];
              }
          }
          // 是否带 body
          if (["POST", "PUT", "PATCH", "DELETE"].indexOf(request.method) >= 0) {
              const ct = (reqHeaders.get('content-type') || "").toLowerCase();
              if (ct.includes('application/json')) {
                    let requestJSON = await request.json()
                    console.log(typeof requestJSON)
                  fp.body = JSON.stringify(requestJSON);
              } else if (ct.includes('application/text') || ct.includes('text/html')) {
                  fp.body = await request.text();
              } else if (ct.includes('form')) {
                  fp.body = await request.formData();
              } else {
                  fp.body = await request.blob();
              }
          }
          // 发起 fetch
          let fr = (await fetch(new URL(url), fp));
          outCt = fr.headers.get('content-type');
          if(outCt && (outCt.includes('application/text') || outCt.includes('text/html'))) {
            try {
              // 添加base
              let newFr = new HTMLRewriter()
              .on("head", {
                element(element) {
                  element.prepend(`<base href="${url}" />`, {
                    html: true
                  })
                },
              })
              .transform(fr)
              fr = newFr
            } catch(e) {
            }
          }
          for (const [key, value] of fr.headers.entries()) {
            outHeaders.set(key, value);
          }
          outStatus = fr.status;
          outStatusText = fr.statusText;
          outBody = fr.body;
      }
  } catch (err) {
      outCt = "application/json";
      outBody = JSON.stringify({
          code: -1,
          msg: JSON.stringify(err.stack) || err
      });
  }

  //设置类型
  if (outCt && outCt != "") {
      outHeaders.set("content-type", outCt);
  }

  let response = new Response(outBody, {
      status: outStatus,
      statusText: outStatusText,
      headers: outHeaders
  })

  return response;

  // return new Response('OK', { status: 200 })
}

/**
* 阻断器
*/
const blocker = {
  keys: [".m3u8", ".ts", ".acc", ".m4s", "photocall.tv", "googlevideo.com"],
  check: function (url) {
      url = url.toLowerCase();
      let len = blocker.keys.filter(x => url.includes(x)).length;
      return len != 0;
  }
}
