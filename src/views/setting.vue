<template>
  <div class="list-page">
    <n-collapse :default-expanded-names="['6']">
      <n-collapse-item name="0" >
        <template #header>绑定 Telegram丨<n-icon style="vertical-align: middle;" size="20" color="#d03050"><IconBrandTelegram /></n-icon></template>
        <n-input v-model:value="telegramUrl" placeholder="填入 Telegram 绑定链接"></n-input>
        <p></p>
        <n-button :disabled="!telegramUrl" type="primary" @click="goTelegram">绑定</n-button>&nbsp;&nbsp;&nbsp;&nbsp;
        <a href="https://t.me/PikPak_Bot" target="_blank">Telegram 机器人地址</a>
      </n-collapse-item>

      <!-- start Aria2设置 -->
      <n-collapse-item name="1" title="Aria2 设置丨">
        <template #header>Aria2 设置丨<n-icon style="vertical-align: middle;" size="20" color="#d03050"><IconPuzzle /></n-icon></template>
        <n-form label-width="120px" label-align="left" label-placement="left" autocomplete="off">
          <n-form-item label="Aria2 RPC：">
            <n-input v-model:value="aria2Data.host" placeholder="例如 http://localhost:6800/jsonrpc" clearable></n-input>
          </n-form-item>
          <n-form-item label="Aria2 Token：">
            <n-input v-model:value="aria2Data.token" type="password" show-password-on="mousedown" clearable></n-input>
          </n-form-item>
          <n-form-item label="限制连接数：" feedback="限制连接数 - 一个下载链接只使用一个网络连接/线程">
            <n-switch v-model:value="aria2Data.restrictConnections">
              <template #checked>开启 - 避免请求频繁</template>
              <template #unchecked>不开启 - Aria2 默认控制</template>
            </n-switch>
          </n-form-item>
          <br>
          <n-form-item label="反代域名：" feedback="反代域名 - 对 Aria2 下载生效">
            <n-input v-model:value="aria2Data.reverseHost" placeholder="例如 http://pcdn.xx.com" clearable></n-input>
          </n-form-item>
          <br>
          <n-form-item label="服务器列表：">
            <n-dynamic-tags v-model:value="aria2Data.serverNumbers" />
          </n-form-item>
          <br>
          <n-form-item label="叠加数量：" feedback="叠加数量 - 对应功能「推送到Aria2」，使用多个链接下载一个文件">
            <n-input-number v-model:value="aria2Data.batchUrlNum" placeholder="需要推送多少个链接下载一个文件" :min="0" :max="64"></n-input-number>
          </n-form-item>
          <br>
          <n-form-item label="叠加策略：" feedback="叠加策略 -「序列循坏」：从「服务器序号列表」中从头到尾选取">
            <n-radio-group v-model:value="aria2Data.batchStrategy">
              <n-radio-button value="series" label="序列循坏">序列循坏</n-radio-button>
            </n-radio-group>
          </n-form-item>
          <br>
          <n-form-item label="文件夹设置：">
            <n-switch v-model:value="aria2Data.dir" >
              <template #checked>推送文件夹时保存文件夹结构</template>
              <template #unchecked>推送文件夹时仅保存文件</template>
            </n-switch>
          </n-form-item>
          <n-form-item>
            <n-button type="primary" @click="testAria2">测试并保存</n-button>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            <br>
            <n-alert type="warning" title="由于浏览器限制，请在浏览器地址栏最前面的「🔒」按钮「网站设置」选项中，将「不安全内容」设置为「允许」">
            </n-alert>
          </n-form-item>
        </n-form>
      </n-collapse-item>
      <!-- end Aria2设置 -->

      <!-- start 下载设置 -->
      <n-collapse-item name="2" title="下载设置丨">
        <template #header>下载设置丨<n-icon style="vertical-align: middle;" size="20" color="#d03050"><IconDownload /></n-icon></template>
        <n-form label-width="120px" label-align="left" label-placement="left">
          <n-form-item label="服务器序号：" feedback="服务器序号 - 替换下载链接域名中的服务器序号，序号请参考上面「Aria2 设置」里的「服务器序号列表」">
            <n-auto-complete
              v-model:value="downloadConfig.serverNumber"
              :options="serverNumbers"
              placeholder="下载服务器序号"
              clearable
            ></n-auto-complete>
          </n-form-item>
          <br>
          <n-form-item label="反代域名：" feedback="反代域名 - 自动在下载链接前加上该反代域名">
            <n-input v-model:value="downloadConfig.reverseHost" placeholder="例如 http://pcdn.xx.com" clearable></n-input>
          </n-form-item>
          <br>
          <n-form-item>
            <n-button type="primary" @click="saveDownloadConfig">保存</n-button>
          </n-form-item>
        </n-form>
      </n-collapse-item>
      <!-- end 下载设置 -->

      <!-- start 播放设置 -->
      <n-collapse-item name="3" title="播放设置丨">
        <template #header>播放设置丨<n-icon style="vertical-align: middle;" size="20" color="#d03050"><IconPhotoVideo /></n-icon></template>
        <n-form label-width="120px" label-align="left" label-placement="left">
          <n-form-item label="服务器序号：" feedback="服务器序号 - 替换播放链接域名中的服务器序号，序号请参考上面「Aria2设置」里的「服务器序号列表」">
            <n-auto-complete
              v-model:value="playConfig.serverNumber"
              :options="serverNumbers"
              placeholder="服务器序号"
              clearable
            ></n-auto-complete>
          </n-form-item>
          <br>
          <n-form-item label="反代域名：" feedback="反代域名 - 自动在播放链接前加上该反代域名">
            <n-input v-model:value="playConfig.reverseHost" placeholder="例如 http://pcdn.xx.com" clearable></n-input>
          </n-form-item>
          <br>
          <n-form-item label="应用到图片查看：" feedback="应用到图片查看 - 查看图片时也使用指定序号和反代域名">
            <n-switch v-model:value="playConfig.applyToImage"></n-switch>
          </n-form-item>
          <br>
          <n-form-item>
            <n-button type="primary" @click="savePlayConfig">保存</n-button>
          </n-form-item>
        </n-form>
      </n-collapse-item>
      <!-- end 播放设置 -->

      <!-- start 自动登录 -->
      <n-collapse-item name="4" title="自动登录丨">
        <template #header>自动登录丨<n-icon style="vertical-align: middle;" size="20" color="#d03050"><IconLogin /></n-icon></template>
        <n-form label-width="100px" label-align="left" label-placement="left">
          <n-form-item label="是否开启">
            <n-switch v-model:value="loginSwitch"></n-switch>
          </n-form-item>
          <template v-if="loginSwitch">
            <n-form-item label="用户名">
              <n-input v-model:value="loginData.username" placeholder="用户名"></n-input>
            </n-form-item>
            <n-form-item label="密码">
              <n-input v-model:value="loginData.password" type="password" show-password-on="mousedown"></n-input>
            </n-form-item>
          </template>
          <n-form-item>
            <n-button type="primary" @click="loginPost">保存</n-button>
          </n-form-item>
        </n-form>
      </n-collapse-item>
      <!-- end 自动登录 -->

      <!-- start 代理设置 -->
      <n-collapse-item name="5">
        <template #header>代理设置丨<n-icon style="vertical-align: middle;" size="20" color="#d03050"><IconPlanet /></n-icon></template>
        <n-input type="textarea" v-model:value="proxyData" rows="4" placeholder="支持多个随机，一行一个，为空则不代理"></n-input>
        <p></p>
        <n-button type="primary" @click="proxyPost">保存设置</n-button>
        <a href="javascript:void(0)" @click="proxyReset">恢复默认</a>
      </n-collapse-item>
      <!-- end 代理设置 -->

      <n-collapse-item title="关于" name="6">
        <n-space>
          <a href="https://t.me/PikPakGroup" target="_blank" class="n-button">PikPak 分享群</a>
           • 
          <a href="https://t.me/PikPakShare" target="_blank" class="n-button">PikPak 分享频道</a>
           • 
          <a href="https://t.me/PikPakChannel" target="_blank" class="n-button">PikPak 通知频道</a>
           • 
          <a href="https://mypikpak.com/" target="_blank" class="n-button">官方网站</a>
           • 
          <a href="https://t.me/pikpak_userservice" target="_blank" class="n-button">官方交流群</a>
           • 
          <a href="https://github.com/northsea4/pikpak" target="_blank" class="n-button">开源仓库</a>
        </n-space>
        <br />
      </n-collapse-item>
    </n-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from '@vue/reactivity';
import { onMounted } from '@vue/runtime-core';
import http from '../utils/axios';
import { isCrossOrigin } from '../utils';
import { 
  NForm, NFormItem, NButton, NInput, NText, NInputNumber,
  NCollapse, NCollapseItem, NSpace, NSwitch, useDialog, 
  NAlert, NLog, NIcon, NAutoComplete, NRadioGroup, NRadioButton,
  NDynamicTags,
} from 'naive-ui';
import { IconBrandTelegram, IconPuzzle, IconDownload, IconPhotoVideo, IconLogin, IconPlanet } from '@tabler/icons-vue';
import {
  proxy as proxyDefault,
  serverNumbers
} from '../config';

const downloadConfig = ref({
  // 自定义服务器序号
  serverNumber: '',
  // 反代域名
  reverseHost: '',
})

const saveDownloadConfig = () => {
  window.localStorage.setItem('pikpakDownload', JSON.stringify(downloadConfig.value))
  window.$message.success('保存成功' , { duration: 1000 })
}

const playConfig = ref({
  // 自定义服务器序号
  serverNumber: '',
  // 反代域名
  reverseHost: '',
  applyToImage: false,
})

const savePlayConfig = () => {
  window.localStorage.setItem('pikpakPlay', JSON.stringify(playConfig.value))
  window.$message.success('保存成功' , { duration: 1000 })
}

const aria2Data = ref({
  host: 'http://localhost:6800/jsonrpc',
  token: '',
  dir: true,
  restrictConnections: false,
  // 使用多少个链接下载同一个文件
  batchUrlNum: 5,
  serverNumbers: serverNumbers,
  // 叠加策略
  batchStrategy: 'series',
  // 反代域名
  reverseHost: '',
})

const browserTipsVisible = computed(() => aria2Data.value.host && isCrossOrigin(aria2Data.value.host))

const testAria2 = () => {
  let postData:any = {
      id:'',
      jsonrpc:'2.0',
      method:'aria2.getGlobalStat',
      params:[]
  }
  if(aria2Data.value.token) {
    postData.params.splice(0, 0, 'token:' + aria2Data.value.token)
  }
  fetch(aria2Data.value.host, {
      method: 'POST',
      body: JSON.stringify(postData),
      headers: new Headers({
      'Content-Type': 'application/json'
    })
  })
    .then(response => response.json())
    .then(res => {
      if(res.error && res.error.message) {
        window.$message.error(res.error.message)
      } else if(res.result) {
        window.localStorage.setItem('pikpakAria2', JSON.stringify(aria2Data.value))
        window.$message.success('保存成功' , { duration: 1000 })
      }
    })
    .catch(error => window.$message.error('Error:', error))
}

const loginSwitch = ref(false)
const loginData = ref({
  username: '',
  password: ''
})
const dialog = useDialog()
const loginPost = () => {
  if(loginSwitch.value) {
    dialog.warning({
      title: '警告',
      content: '记住登陆是指浏览器本地明文保存用户名密码用于下次自动登陆，请勿在非信任设备选择',
      positiveText: '确定',
      negativeText: '不确定',
      onPositiveClick: () => {
        window.localStorage.setItem('pikpakLoginData', JSON.stringify(loginData.value))
        window.$message.success('已保存登录信息' , { duration: 1000 })
      },
      onNegativeClick: () => {
      },
    })
  } else {
    window.localStorage.removeItem('pikpakLoginData')
  }
}

const proxyData = ref('')
const proxyPost = () => {
  let proxyValue = proxyData.value.split('\n').filter(item => item != '')
  window.localStorage.setItem('proxy', JSON.stringify(proxyValue))
  window.localStorage.setItem('isSettingProxy', 'true')
  window.$message.success('保存成功' , { duration: 1000 })
}
const proxyReset = () => {
  window.localStorage.setItem('proxy', JSON.stringify(proxyDefault))
  window.localStorage.removeItem('isSettingProxy')
  proxyData.value = proxyDefault.join('\n')
  window.$message.success('已恢复' , { duration: 1000 })
}

onMounted(() => {
  let aria2 = JSON.parse(window.localStorage.getItem('pikpakAria2') || '{}')
  if(aria2.dir === undefined) {
    aria2.dir = true
  }
  if(aria2.serverNumbers === undefined) {
    aria2.serverNumbers = serverNumbers
  }
  if(aria2.host) {
    aria2Data.value = aria2
  }

  let dc = JSON.parse(window.localStorage.getItem('pikpakDownload') || '{}')
  downloadConfig.value = dc

  let _pc = JSON.parse(window.localStorage.getItem('pikpakPlay') || '{}')
  playConfig.value = _pc

  let login = JSON.parse(window.localStorage.getItem('pikpakLoginData') || '{}')
  if(login.username && login.password) {
    loginData.value = login
    loginSwitch.value = true 
  }
  let proxy = JSON.parse(window.localStorage.getItem('proxy') || '[]')
  if(proxy.length) {
    proxyData.value = proxy.join('\n')
  }
})

const telegramUrl = ref()
const goTelegram = () => {
  let login = JSON.parse(window.localStorage.getItem('pikpakLogin') || '{}')
  if(!login && !login.access_token) {
    window.$message.error('请先登陆')
    return false
  }
  
  let matchArray = telegramUrl.value &&  decodeURIComponent(telegramUrl.value).match(/(^|&)token=([^&]*)(&|$)/)
  console.log(matchArray)
  if(!matchArray || !matchArray.length || matchArray.length != 4) {
    window.$message.error('请输入正确链接')
    return false
  }
  http.post('https://api-drive.mypikpak.com/user/v1/bind', {
      accessToken: login.access_token,
      thirdType: "TG",
      thirdToken: matchArray[2]
    })
    .then((res:any) => {
      telegramUrl.value = ''
      if(res.data.bound) {
        window.$message.success('绑定成功' , { duration: 1000 })
      } else {
        window.$message.error('绑定失败')
      }
    })
}
</script>

<style>
.list-page {
  padding: 40px;
}

@media(max-width: 968px) {
  .list-page {
    padding: 10px;
  }
}
</style>
