const db = wx.cloud.database()

function initCloud() {
  if (!wx.cloud) return false
  return true
}

function callFunction(name, data = {}) {
  return wx.cloud.callFunction({ name, data }).then(res => {
    if (res.result && res.result.error) {
      return Promise.reject(new Error(res.result.error))
    }
    return res.result
  })
}

module.exports = {
  db,
  initCloud,
  callFunction
}
