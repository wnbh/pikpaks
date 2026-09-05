<template>
    <div class="list-page list-page-files"  @contextmenu.prevent>
      <div class="header">
        <div class="title n-ellipsis">
          <n-breadcrumb separator=">">
            <n-breadcrumb-item>
              <router-link to="/redirect/list">文件</router-link>
            </n-breadcrumb-item>
            <n-breadcrumb-item v-for="(pathItem, k) in listStore.paths" :key="k">
              <router-link :to="`/redirect/list/${pathItem.id}`">
                <n-tooltip placement="bottom-start" trigger="hover">
                  <template #trigger>
                    {{pathItem.name}}
                  </template>
                  <span>{{pathItem.name}}</span>
                </n-tooltip>
              </router-link>
            </n-breadcrumb-item>
          </n-breadcrumb>
        </div>
        <div class="action">
          <n-space>
            <n-button-group v-if="moveFiles?.length">
              <n-button type="default" @click="movePost">
                剪切{{moveFiles.length}}项资源
              </n-button>
              <n-button type="warning" @click="movePost('cancel')">
                <template #icon>
                  <n-icon><IconCircleX /></n-icon>
                </template>
              </n-button>
            </n-button-group>
  
            <n-button-group v-if="copyFiles?.length">
              <n-button @click="copyPost">
                复制{{copyFiles.length}}项资源
              </n-button>   
              <n-button type="warning" @click="copyPost('cancel')">
                <template #icon>
                  <n-icon><IconCircleX /></n-icon>
                </template>
              </n-button>
            </n-button-group>
    
            <n-button  @click="showUserMenu = true">
              添加菜单
            </n-button>
            <n-button text style="font-size: 24px; vertical-align: middle" @click="showAddUrl = true">
              <n-icon :color="themeVars.primaryColor">
                <IconCirclePlus />
              </n-icon>
            </n-button>
          </n-space>
        </div>
      </div>
      <n-data-table v-model:checked-row-keys="checkedRowKeys"  :row-key="row => row.id" :data="filesList" size="small" :columns="columns" :bordered="false" max-height="calc(100vh - 230px)" @scroll="scrollHandle" :row-props="rowProps"></n-data-table>
      <n-dropdown
        placement="bottom-start"
        trigger="manual"
        :x="x"
        :y="y"
        :options="getMenu()"
        :show="showDropdown"
        :on-clickoutside="onClickoutside"
        @select="handleSelect"
      />
      <div class="loading" v-if="loading">
        <n-spin size="small" />加载中
      </div>
      <task-vue ref="taskRef"></task-vue>
  
      <div class="outer-wrapper static show" v-if="checkedRowKeys.length">
        <div class="toolbar-wrapper">
          <div class="toolbar-item" @click="batchCopyAll">
            <n-tooltip>
              <template #trigger>
                <n-icon>
                  <IconCopy />
                </n-icon>
              </template>
              复制所选
            </n-tooltip>
          </div>
          <div class="toolbar-item" @click="batchMoveAll">
            <n-tooltip>
              <template #trigger>
                <n-icon>
                  <IconCut />
                </n-icon>
              </template>
              剪切所选
            </n-tooltip>
          </div>
          <div class="toolbar-item" @click="aria2All">
            <n-tooltip>
              <template #trigger>
                <n-icon>
                  <IconCloudDownload />
                </n-icon>
              </template>
              推送到 Aria2
            </n-tooltip>
          </div>
          <div class="toolbar-item" @click="copyAll">
            <n-tooltip>
              <template #trigger>
                <n-icon>
                  <IconLink />
                </n-icon>
              </template>
              复制秒传链接
            </n-tooltip>
          </div>
          <div class="toolbar-item" @click="shareall">
            <n-tooltip>
              <template #trigger>
                <n-icon>
                  <IconShare />
                </n-icon>
              </template>
              分享所选
            </n-tooltip>
          </div>
          <div class="toolbar-item" @click="deleteFile(checkedRowKeys)">
            <n-tooltip>
              <template #trigger>
                <n-icon>
                  <IconTrash />
                </n-icon>
              </template>
              删除所选
            </n-tooltip>
          </div>
        </div>
      </div>
  
      <n-modal v-model:show="showAddUrl">
        <n-card style="width: 600px;" title="添加链接或新建文件夹">
          <template #header-extra>
            <n-icon size="24" @click="showAddUrl = false">
              <IconCircleX />
            </n-icon>
          </template>
          <n-alert :show-icon="false" closable title="添加说明">
            <div>1. 支持 Magnet 链接(magnet:?xt=urn)，Magent 链接只能默认保存到 My Pack</div>
            <div>2. 支持秒传链接(PikPak://PikPak Tutorial.mp4|******|******)，秒传链接默认保存到当前文件夹或第一个文件夹，不能保存到根目录</div>
            <div>3. 支持新建文件夹（普通格式，不带:）</div>
            <div>4. 换行添加多个</div>
            <div>5. 支持在页面按下 Ctrl+v 粘贴磁链或秒传链接时自动添加任务（会排除在输入框的操作）</div>
          </n-alert>
          <br />
          <n-input type="textarea" :rows="4" placeholder="请按说明填写" v-model:value="newUrl"></n-input>
          <template #action>
            <n-button :block="true" type="primary" :disabled="!newUrl" @click="addUrl">添加</n-button>
          </template>
        </n-card>
      </n-modal>
  
      <n-modal v-model:show="showVideo">
        <n-card style="width: 80vw; height: 80vh;" :title="fileInfo ? fileInfo.name : '视频'">
          <template #header-extra>
            <n-icon size="24" @click="showVideo = false">
              <IconCircleX />
            </n-icon>
          </template>
          <div style="width: 100%; height: 100%">
            <!-- <Video :src="fileInfo.web_content_link" :type="fileInfo.mime_type"></Video> -->
            <plyr-vue :video="fileInfo"></plyr-vue>
          </div>
        </n-card>
      </n-modal>
      
      <n-modal v-model:show="showImage">
        <n-card style="width: 80vw; height: 80vh;" :title="fileInfo ? fileInfo.name : '图片'">
          <template #header-extra>
            <n-icon size="24" @click="showImage = false">
              <IconCircleX />
            </n-icon>
          </template>
          <div style="width: 100%; height: 65vh; text-align: center;">
            <img :src="fileInfo?.web_content_link" style="max-width: 100%; max-height: 100%">
          </div>
        </n-card>
      </n-modal>
      
      <n-modal v-model:show="showName">
        <n-card style="width: 600px;" title="修改名称">
          <template #header-extra>
            <n-icon size="24" @click="showName = false">
              <IconCircleX />
            </n-icon>
          </template>
          <template v-if="newName">
            <n-input :placeholder="newName.value" v-model:value="newName.value"></n-input>
          </template>
          <template #action>
            <n-button :block="true" type="primary" :disabled="!newName || !newName.value" @click="namePost">重命名</n-button>
          </template>
        </n-card>
      </n-modal>
  
      <n-modal v-model:show="showUserMenu">
        <n-card style="width: 600px;" title="自定义菜单">
          <template #header>
            自定义菜单 <a href="https://telegra.ph/PikPak-Tutorial-Series-08-29" target="_blank"> <n-icon style="vertical-align: middle;" size="20" color="#d03050"><IconZoomQuestion /></n-icon> </a>
          </template>
          <template #header-extra>
            <n-icon size="24" @click="showUserMenu = false">
              <IconCircleX />
            </n-icon>
          </template>
          <n-form label-width="160px" label-align="left" label-placement="left">
            <n-form-item label="自定义菜单列表：">
              <n-space>
                <template v-for="(item, key) in userMenu" :key="key">
                  <n-tag :closable="true" @close="removeUserMenu(key)">{{item.name}}</n-tag>
                </template>
              </n-space>
            </n-form-item>
            <n-form-item label="自定义菜单名称：">
              <n-input v-model:value="newMenu.name"></n-input>
            </n-form-item>
            <n-form-item label="自定义菜单类型：">
              <n-select :options="menuTypeList" v-model:value="newMenu.type"></n-select>
            </n-form-item>
            <n-form-item label="自定义菜单可插入：">
              <n-space>
                <template v-for="(item,k) in menuTextList" :key="k">
                  <n-button @click="newMenu.content = newMenu.content + '{{' + k + '}}'">{{item}}</n-button>
                </template>
              </n-space>
            </n-form-item>
            <n-form-item label="自定义菜单内容：">
              <n-input type="textarea" v-model:value="newMenu.content"></n-input>
            </n-form-item>
            <n-form-item>
              <n-button type="primary" @click="addUserMenu">添加</n-button>
            </n-form-item>
          </n-form>
        </n-card>
      </n-modal>
      
      <n-modal v-model:show="showCopy">
        <n-card style="width: 600px;" title="复制链接">
          <template #header-extra>
            <n-icon size="24" @click="showCopy = false">
              <IconCircleX />
            </n-icon>
          </template>
          <n-form label-width="40px" label-align="left" label-placement="left">
            <template v-for="item in fileInfo?.medias" :key="item.media_id">
              <n-form-item :label="item.media_name">
                <n-input-group>
                  <n-input :value="item.link.url"></n-input>
                  <n-button type="primary" @click="copy(item.link.url)">复制</n-button>
                </n-input-group>
              </n-form-item>
            </template>
            <n-form-item label="链接">
              <n-input-group>
                <n-input :value="fileInfo?.web_content_link"></n-input>
                <n-button type="primary" @click="copy(fileInfo.web_content_link)">复制</n-button>
              </n-input-group>
            </n-form-item>
          </n-form>
        </n-card>
      </n-modal>
  
      <n-modal v-model:show="showCopyFail">
        <n-card style="width: 600px;" title="复制失败，自己选择复制">
          <template #header-extra>
            <n-icon size="24" @click="showCopyFail = false">
              <IconCircleX />
            </n-icon>
          </template>
          <n-form label-width="0" label-align="left" label-placement="left">
            <n-form-item>
              <n-input :value="copyValue"></n-input>
            </n-form-item>
          </n-form>
        </n-card>
      </n-modal>
  
      <n-modal v-model:show="showShareMenu">
        <n-card style="width: 350px;" title="分享">
          <template #header-extra>
            <n-icon size="24" @click="showShareMenu = false">
              <IconCircleX />
            </n-icon>
          </template>
          <n-form label-width="auto" label-align="left" label-placement="left">
            <n-form-item label="分享标题：">
              <n-input v-model:value="title"  type="text" size="small" placeholder="留空则由分享文件名称决定" clearable ></n-input>
            </n-form-item>
            <n-form-item label="转存次数：">
              <n-input-number v-model:value="limit" placeholder="留空无限制" size="small" clearable :min="1" />
            </n-form-item>
            <n-space>加密链接:<n-switch v-model:value="switch_share_pass" /></n-space>
            <n-form-item>
              <n-input v-model:value="password" minlength="4" maxlength="10" show-count type="text" size="small" placeholder="请输入4-10位密码，留空随机产生" :allow-input="allowinput" clearable :disabled="!switch_share_pass"></n-input>
            </n-form-item>
            <n-form-item label="有效期：">
              <n-select v-model:value="date" placeholder="默认永久有效" size="small" :options="dateList" :disabled="switch_share_time" ></n-select>
            </n-form-item>
            <n-space>自定义时间:<n-switch v-model:value="switch_share_time" /></n-space>
            <n-form-item>
              <n-date-picker v-model:formatted-value="closetime" placeholder="选择日期" size="small" type="datetime" input-readonly clearable format="yyyy-MM-dd'T'HH:mm:ss.SSSxxx" :disabled="!switch_share_time" :style="{ width: '300px' }"/>
            </n-form-item>
          </n-form>
          <n-space justify="end">
              <n-button type="primary" @click="share">分享并复制链接</n-button>
          </n-space>
        </n-card>
      </n-modal>

      <n-modal v-model:show="showunzipMenu1">
        <n-card style="width: 600px" title="输入密码">
          <template #header-extra>
            <n-icon size="24" @click="showunzipMenu1 = false">
              <IconCircleX />
            </n-icon>
          </template>
          <template v-if="showunzipMenu1">
            <n-input v-model:value="zip_password"></n-input>
          </template>
          <template #action>
            <n-button :block="true" type="primary" @click="getziplist(); showunzipMenu1 = false;">确认</n-button>
          </template>
        </n-card>
      </n-modal>
      <n-modal v-model:show="showunzipMenu2">
        <n-card style="width: 600px; height: calc(100vh - 230px)">
          <template #header>
            <n-icon style="vertical-align: middle" size="24"  @click="showunzipMenu2 = false">
              <IconChevronLeft />
            </n-icon>
            {{ fileInfo.name }}
          </template>
          <template #header-extra>
            <n-icon size="24" @click="showunzipMenu2 = false">
              <IconCircleX />
            </n-icon>
          </template>
          <div style="height: calc(100vh - 430px)" @contextmenu.prevent>
            <n-data-table v-model:checked-row-keys="zip_checkedRowKeys" :row-key="(row) => row.path" :data="zipInfo" size="small" :columns="zip_columns" :bordered="false" max-height="calc(100vh - 430px)"></n-data-table>
          </div>
          <template #footer>
            <n-button :block="true" type="primary" @click="unzip(); showunzipMenu2 = false;">{{zip_checkedRowKeys.length ? "解压" + zip_checkedRowKeys.length + "项" : "解压全部"}}</n-button>
          </template>
        </n-card>
      </n-modal>
        
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref } from '@vue/reactivity';
  import { h, computed, onMounted, watch, nextTick } from '@vue/runtime-core';
  import http, { asyncPool } from '../utils/axios';
  import { useRoute, useRouter } from 'vue-router';
  import { 
    DataTableColumns, NDataTable, NTime, NEllipsis, NModal, NCard, NInput, NBreadcrumb, 
    NBreadcrumbItem, NIcon, useThemeVars, NButton, NTooltip, NSpace, NScrollbar, NSpin, 
    NDropdown, useDialog, NAlert, useNotification, NotificationReactive, NSelect, NForm, 
    NFormItem, NTag, NText, NInputGroup, NPopover, NButtonGroup,NImage,DropdownOption,
    NSwitch, NDatePicker,NInputNumber,
  } from 'naive-ui';
  import { IconZoomQuestion, IconCircleX, IconCirclePlus, IconDots, IconCopy, IconCut, IconCloudDownload, IconLink, IconShare, IconTrash, IconChevronLeft } from '@tabler/icons-vue';
  import { 
    byteConvert, delay, getMagnetLinksFromText, getPikpakLinksFromText, isPikpakLink,
    refineAria2DownloadUrl, refineDownloadUrl, refinePlayUrl, refineImageUrl,
    pickBestUrl, getFile,
  } from '../utils';
  import PlyrVue from '../components/Plyr.vue';
  import TaskVue from '../components/Task.vue';
  import ClipboardJS from 'clipboard';
  import streamSaver from 'streamsaver';
  import { DropdownMixedOption } from 'naive-ui/lib/dropdown/src/interface';
  import axios, { AxiosInstance } from 'axios';
  import { useListStoreWithOut } from '../store/modules/list';
  import { serverNumbers } from '../config';
  
    const filesList = ref()
    const route = useRoute()
    const router = useRouter()
    const listStore = useListStoreWithOut()
    const themeVars = useThemeVars()
    const checkedRowKeys = ref<string[]>([])
    const dialog = useDialog()
    const smallColums = ref<DataTableColumns>([
      {
        title: '修改时间',
        key: 'modified_time',
        sorter: 'default',
        align: 'right',
        render: (row) => {
          return h(NTime, {
            time: new Date(String(row.modified_time) || ''),
            format: 'yy-MM-dd HH:mm:ss.SSS',
          })
        },
        className: 'modified_time',
        width: 170
      },
    ])
    const columns = ref<DataTableColumns>([
      {
        type: 'selection'
      },
      {
        title: "名称",
        key: "name",
        //合并此列表头与下一列表头
        titleColSpan: 2,
        //根据key的值来决定对什么排序
        sorter: "default",
        render: (row: any) => {
          if (
            row.mime_type.indexOf("video") != -1 ||
            row.mime_type.indexOf("image") != -1
          ) {
            return h(NImage, {
              width: 28,
              height: 28,
              src: refineImageUrl(playConfig.value, row.thumbnail_link || row.icon_link),
            });
          } else {
            return h("img", {
              width: 28,
              height: 28,
              src: refineImageUrl(playConfig.value, row.thumbnail_link || row.icon_link),
            });
          }
        },
        width: 48,
      },
      {
        title: '名称',
        key: 'name',
        sorter: 'default',
        render: (row:any) => {
          return h('div', {
            class: 'file-info',
            onClick: () => {
              if(row.kind === 'drive#folder') {
                router.push('/list/' + row.id)
              } else if(row.mime_type.indexOf('video') != -1 || row.mime_type.indexOf('image') != -1  || row.mime_type.indexOf('audio') != -1) {
                getFile(row.id)
                  .then(res => {
                    fileInfo.value = res.data
                    if(fileInfo.value.web_content_link) {
                      if(row.mime_type.indexOf('video') != -1 || row.mime_type.indexOf('audio') != -1) {
                        fileInfo.value.web_content_link = refinePlayUrl(playConfig.value, fileInfo.value.web_content_link)
                        fileInfo.value.medias.forEach((item: any) => {
                          item.link.url = refinePlayUrl(playConfig.value, item.link.url)
                        })
                        showVideo.value = true
                      } else {
                        fileInfo.value.web_content_link = refineImageUrl(playConfig.value, fileInfo.value.web_content_link)
                        showImage.value = true
                      }
                    }
                  })
              }
            }
          }, [
            h(NEllipsis, {
                class: 'title',
              },
              {
                default: () => String(row.name)
              }
            ),
            h('span', {
              class: 'action'
            }, '1')
          ])
        }
      },
      {
        title: '大小',
        key: 'size',
        sorter: (rowA:any, rowB:any) => {
          return rowA.size - rowB.size
        },
        align: 'right',
        render: (row) => Number(row.size) > 0 ? byteConvert(Number(row.size)) : '',
        className: 'size',
        width: 100
      },
    ])
    
    //右键菜单事件
    const getMenu = () => {
      const options: DropdownOption[] = [
        {
          label: "📝 重命名",
          key: "name",
        },
        {
          label: "📋 复制",
          key: "batchCopy",
        },
        {
          label: "✂️ 剪切",
          key: "batchMove",
        },
        {
          label: "📦 解压",
          key: "unzip",
          disabled: fileInfo.value?.file_category !== "ARCHIVE",
        },
        {
          label: "⏬ 直接下载",
          key: "down",
          disabled: fileInfo.value?.size <= 0,
        },
        {
          label: "🔗 复制下载链接",
          key: "copyDown",
          disabled: fileInfo.value?.size <= 0,
        },
        {
          label: "📤 推送到 Aria2",
          key: "aria2Post",
          disabled:
            fileInfo.value?.size <= 0 || !aria2Data.value || !aria2Data.value.host,
        },
        {
          label: "📋 复制秒传链接",
          key: "code",
          disabled: !fileInfo.value?.hash,
        },
        {
          label: "📋 分享",
          key: "share",
        },
        {
          label: "❌ 删除",
          key: "delete",
        },
      ];
      if (fileInfo.value?.kind !== "drive#folder") {
        if (userMenu.value.length) {
          options.push({
            type: "divider",
            key: "d1",
          });
          userMenu.value.forEach((item, key) => {
            options.push({
              label: item.name,
              key: "user-" + key,
            });
          });
        }
      }
      return options;
    };
    const showDropdown = ref(false);
    const handleSelect = (key: string) => {
      switch (key) {
        case "name":
          nameModelSHow(fileInfo.value);
          break;
        case "batchCopy":
          batchCopy([fileInfo.value.id]);
          break;
        case "batchMove":
          batchMove([fileInfo.value.id]);
          break;
        case "unzip":
          zip_password.value = undefined;
          zip_path.value = undefined;
          getziplist();
          break;
        case "down":
          downFile(fileInfo.value.id);
          break;
        case "copyDown":
          getFile(fileInfo.value.id).then((res: any) => {
            fileInfo.value = res.data;
            showCopy.value = true;
            fileInfo.value.web_content_link = refineDownloadUrl(
              downloadConfig.value,
              fileInfo.value.web_content_link,
            );
            fileInfo.value.medias.forEach((item: any) => {
              item.link.url = refineDownloadUrl(
                downloadConfig.value,
                item.link.url,
              );
            });
          });
          break;
        case "aria2Post":
          getFile(fileInfo.value.id).then((res: any) => {
            aria2Post(res);
          });
          break;
        case "code":
          copy(
            `PikPak://${fileInfo.value.name}|${fileInfo.value.size}|${fileInfo.value.hash}`,
          );
          break;
        case "share":
          title.value = undefined;
          switch_share_pass.value = false;
          switch_share_time.value = false;
          password.value = undefined;
          limit.value = undefined;
          date.value = undefined;
          closetime.value = undefined;
          showShareMenu.value = true;
          break;
        /*case "base":
          window.localStorage.setItem(
            "pikpakUploadFolder",
            JSON.stringify(fileInfo.value),
          );
          break;*/
        case "delete":
          dialog.warning({
            title: "警告",
            content: "确定删除" + fileInfo.value.name + "？",
            positiveText: "确定",
            negativeText: "不确定",
            onPositiveClick: () => {
              deleteFile(String(fileInfo.value.id));
            },
          });
          break;
        default:
          if (key.indexOf("user") !== -1) {
            const userMenuKey = Number(key.replace("user-", ""));
            const keyMenu = userMenu.value[userMenuKey];
            if (keyMenu) {
              getFile(fileInfo.value.id).then((res: any) => {
                const render = (template: string) => {
                  return template.replace(/\{\{(.*?)\}\}/g, (match, key) => {
                    key = key.trim();
                    let data = res.data[key];
                    if (
                      key === "web_content_link" &&
                      res.data.medias &&
                      res.data.medias.length > 0
                    ) {
                      data = res.data.medias[0]?.link?.url || data;
                    }
                    return data;
                  });
                };
                if (keyMenu.type === "a") {
                  window.open(render(keyMenu.content), "_target");
                } else if (keyMenu.type === "copy") {
                  copy(render(keyMenu.content));
                }
              });
            }
          }
          break;
      }
      showDropdown.value = false;
    };
    const onClickoutside = () => {
      showDropdown.value = false;
    };
    const x = ref(0);
    const y = ref(0);
    const rowProps = (row: any) => {
      return {
        onContextmenu: (e: MouseEvent) => {
          e.preventDefault();
          showDropdown.value = false;
          nextTick().then(() => {
            fileInfo.value = row;
            checkedRowKeys.value = [];
            showDropdown.value = true;
            x.value = e.clientX;
            y.value = e.clientY;
          });
        },
      };
    };
    
    //分享文件事件
    const showShareMenu = ref(false);
    const title = ref();
    const switch_share_pass = ref(false);
    const password = ref();
    const limit = ref();
    const date = ref();
    const switch_share_time = ref(false);
    const closetime = ref();
    const allowinput = (value: string) => {
      return !value || /^[A-Za-z0-9]+$/.test(value);
    };
    const dateList = ref([
      {
        label: "永久有效",
        value: "-1",
      },
      {
        label: "7天",
        value: "7",
      },
      {
        label: "14天",
        value: "14",
      },
      {
        label: "30天",
        value: "30",
      },
    ]);
    const share = () => {
      let share = true;
      let pass_code_option = "NOT_REQUIRED";
      let share_to = "publiclink";
      let custom_pass_code = undefined;
      let restore_limit = "-1";
      let expiration_days = undefined;
      let expiration_at = undefined;
      if (switch_share_pass?.value) {
        pass_code_option = "REQUIRED";
        share_to = "encryptedlink";
        custom_pass_code = password.value || "";
        if ("0" < custom_pass_code.length && custom_pass_code.length < "4") {
          window.$message.warning("密码不能低于4位");
          share = false;
        }
      }
      if (limit?.value) {
        restore_limit = limit?.value;
      }
      if (!switch_share_time?.value) {
        expiration_days = date.value || "-1";
        expiration_at = undefined;
      } else {
        expiration_days = undefined;
        expiration_at = closetime.value;
        if (expiration_at == undefined) {
          window.$message.warning("未设定到期时间");
          share = false;
        }
      }
      let file_ids: string[] = [];
      if (checkedRowKeys.value.length) {
        filesList.value.forEach((item: FileInfo) => {
          if (checkedRowKeys.value.indexOf(item.id) !== -1) {
            file_ids.push(item.id);
          }
        });
      } else {
        file_ids.push(fileInfo.value.id);
      }
      if (share == true) {
        http
          .post("https://api-drive.mypikpak.com/drive/v1/share", {
            title: title.value,
            custom_pass_code: custom_pass_code,
            pass_code_option: pass_code_option,
            share_to: share_to,
            restore_limit: restore_limit,
            expiration_days: expiration_days,
            expiration_at: expiration_at,
            file_ids: file_ids,
          })
          .then((res: any) => {
            console.log(res.data);
            checkedRowKeys.value = [];
            if (res.data?.share_id) {
              let link =
                window.location.origin +
                "/#/s/" +
                res.data.share_id +
                "/" +
                res.data.pass_code;
              copy(link);
            }
          });
        showShareMenu.value = false;
      }
    };
    const shareall = () => {
      title.value = undefined;
      switch_share_pass.value = false;
      switch_share_time.value = false;
      password.value = undefined;
      limit.value = undefined;
      date.value = undefined;
      closetime.value = undefined;
      showShareMenu.value = true;
    };

    //解压文件事件
    const showunzipMenu1 = ref(false);
    const showunzipMenu2 = ref(false);
    const zip_path = ref();
    const zip_password = ref();
    const zipInfo = ref();
    const zip_checkedRowKeys = ref<string[]>([]);
    const zip_columns = ref<DataTableColumns>([
      {
        type: "selection",
      },
      {
        title: "名称",
        key: "filename",
        //合并此列表头与下一列表头
        titleColSpan: 2,
        //根据key的值来决定对什么排序
        sorter: "default",
        render: (row: any) => {
          return h("img", {
            width: 28,
            height: 28,
            src: row.icon_link,
          });
        },
        width: 48,
      },
      {
        title: "名称",
        key: "filename",
        sorter: "default",
        render: (row: any) => {
          return h(
            "div",
            {
              class: "file-info",
              onClick: () => {
                if (row.kind === "drive#folder") {
                  zip_path.value = row.path;
                  getziplist();
                }
              },
            },
            [
              h(
                NEllipsis,
                {
                  class: "title",
                },
                {
                  default: () => String(row.filename),
                },
              ),
              h(
                "span",
                {
                  class: "action",
                },
                "1",
              ),
            ],
          );
        },
      },
      {
        title: "大小",
        key: "filesize",
        sorter: (rowA: any, rowB: any) => {
          return rowA.filesize - rowB.filesize;
        },
        align: "right",
        render: (row) =>
          Number(row.filesize) > 0 ? byteConvert(Number(row.filesize)) : "",
        className: "size",
        width: 100,
      },
    ]);
    const getziplist = () => {
      zip_checkedRowKeys.value = [];
      http
        .post("https://api-drive.mypikpak.com/decompress/v1/list", {
          gcid: fileInfo.value.hash,
          path: zip_path.value || "",
          password: zip_password.value,
          file_id: fileInfo.value.id,
        })
        .then((res: any) => {
          if (res.data.status !== "OK") {
            window.$message.error(res.data.status_text);
            showunzipMenu1.value = true;
          } else {
            zipInfo.value = res.data.files;
            zip_checkedRowKeys.value = [];
            showunzipMenu2.value = true;
          }
        });
    };
    const unzip = () => {
      let zip_file: string[] = [];
      if (zip_checkedRowKeys.value.length) {
        zipInfo.value.forEach((item: any): void => {
          if (zip_checkedRowKeys.value.indexOf(item.path) !== -1) {
            zip_file.push(item);
          }
        });
      }
      http
        .post("https://api-drive.mypikpak.com/decompress/v1/decompress", {
          gcid: fileInfo.value.hash,
          password: zip_password.value,
          file_id: fileInfo.value.id,
          files: zip_file || undefined,
          default_parent: true,
        })
        .then((res: any) => {
          if (res.data.status !== "OK") {
            window.$message.error(res.data.status_text);
          }
          console.log(res.data);
        });
    };
    
    const loading = ref(false)
    const pageToken = ref()
    const getFileList = async() => {
      loading.value = true
      let filters:any = {
          "phase": {"eq": "PHASE_TYPE_COMPLETE"},
          "trashed":{"eq":false}
      }
      /*if(route.name != 'list') {
        filters['mime_type'] = {"prefix": String(route.name) + '/'}
      }*/
      //对象（Object）转换为字符串（String）
      filters = JSON.stringify(filters)
      let parent_id = route.name !== 'list' ? '*' : route.params.id
      let list:any = []
      do {
        const res:any = await http.get('https://api-drive.mypikpak.com/drive/v1/files', {
          params: {
            parent_id: parent_id,
            thumbnail_size: 'SIZE_LARGE',
            with_audit: true,
            page_token: pageToken.value || undefined,
            limit: 500,
            filters: filters
          }
        })
        pageToken.value = res.data.next_page_token
        list = list.concat(res.data.files)
      } while (pageToken.value)
      loading.value = false
      filesList.value = list
    }
  
    const initPage = () => {
      moveFiles.value = JSON.parse(window.localStorage.getItem('pikpakMoveFiles') || '[]')
      copyFiles.value = JSON.parse(window.localStorage.getItem('pikpakCopyFiles') || '[]')
      userMenu.value = JSON.parse(window.localStorage.getItem('pikpakUserMenu') || '[]')
      window.localStorage.setItem('upload_path', JSON.stringify(window.location.href.split('list')[1]))
      
      checkedRowKeys.value = []
  
      if (route.path.indexOf('/list') === 0) {
        const paramId = route.params.id
        let dirId = ''
        if (typeof paramId === 'string') {
          dirId = paramId
        }
        
        if (!dirId || dirId === '*') {
          listStore.clear()
        } else {
          if (filesList.value && filesList.value.length) {
            const dir: FileInfo = filesList.value.find((f: FileInfo) => f.id === dirId)
            if (dir) {
              listStore.push(dir)
            }
          } else {
            listStore.pushId(dirId, true)
          }
        }
      } else if (route.path.indexOf('/redirect/list') !== 0) {
        listStore.clear()
      }
  
      filesList.value = []
  
      pageToken.value = ''
      getFileList()
      parentInfo.value = {}
    }
  
    watch(route, () => {
      initPage()
    })
  
    const aria2Data = ref()
    const downloadConfig = ref()
    const playConfig = ref()
    const parentInfo = ref()
    const samllPage = ref(true)
  
    onMounted(() => {
      const width = document.body.clientWidth
      if(width > 968) {
        samllPage.value = false
        columns.value.splice(3, 0, ...smallColums.value)
        columns.value[columns.value.length - 1].width = 300
      }
      let aria2 = JSON.parse(window.localStorage.getItem('pikpakAria2') || '{}')
      if(aria2.dir === undefined) {
        aria2.dir = true
      }
      aria2.serverNumbers = serverNumbers
      // 叠加策略：
      aria2.batchStrategy = 'series'
      if(aria2.host) {
        aria2Data.value = aria2
      }
  
      let dc = JSON.parse(window.localStorage.getItem('pikpakDownload') || '{}')
      downloadConfig.value = dc
  
      let _pc = JSON.parse(window.localStorage.getItem('pikpakPlay') || '{}')
      playConfig.value = _pc
  
      initPage()
      window.onbeforeunload = function (e) {
        if(!window.$downId || window.$downId.length === 0) {
          return null
        }
        e = e || window.event;
  
        // 兼容IE8和Firefox 4之前的版本
        if (e) {
          e.returnValue = '还有待下载文件'
        }
  
        // Chrome, Safari, Firefox 4+, Opera 12+ , IE 9+
        return '还有待下载文件?'
      }
  
      document.onpaste = handlePaste
    })
  
    // 粘贴事件处理（自动填写添加内容，直接提交添加）
    const handlePaste = async (e: any) => {
      const tag = (e.target ? e.target.tagName : '').toLowerCase()
      const isTagValid = !['input', 'textarea', 'file'].includes(tag)
      const isOnEditMode = document.designMode === 'on' || e.target.contentEditable === true
      if (!isTagValid || isOnEditMode) {
        return
      }
      const text = e.clipboardData.getData('text').trim()
      const magnetLinks = getMagnetLinksFromText(text, false)
      const pikpakLinks = getPikpakLinksFromText(text, false)
      const links = [ ...magnetLinks, ...pikpakLinks ]
      if (links.length) {
        window.$message.info(`自动填写粘贴的内容并提交...` , { duration: 1000 })
        newUrl.value = links.join("\n")
        showAddUrl.value = true
        await delay(1000)
        addUrl()
      }
    }
  
    const fileInfo = ref()
  
    const getFileMultiTimes = (id:string, times:number) => {
      const list:Array<string> = []
      for (let i = 0; i < times; i++) {
        list.push(id)
      }
      return asyncPool(aria2Data.value.batchUrlConcurrence, list, getFile)
    }
  
    const showVideo = ref(false)
    const showImage = ref(false)
    const showAddUrl = ref(false)
    const showCopy = ref(false)
    const newUrl = ref()
    const taskRef = ref()
    const firstFolder = computed(() => {
      let id:string = ''
      if(route.params.id) {
        id = String(route.params.id)
      } else {
        for(let i in filesList.value) {
          if(filesList.value[i].kind === 'drive#folder') {
            id = filesList.value[i].id
            break
          }
        }
      }
      return id
    })
  
    const addUrl = () => {
      const urlList = newUrl.value.split('\n')
      let successLength = 0
      let hasTask = false
      let hasHash = false
      urlList.forEach((url:string) => {
        if(url) {
          let postData = {}
          // 秒传
          if(isPikpakLink(url)) {
            const urlData = url.substring(9).split('|')
            hasHash = true
            postData = {
                kind: "drive#file",
                parent_id: firstFolder.value,
                name: urlData[0],
                size: urlData[1],
                hash: urlData[2],
                upload_type: "UPLOAD_TYPE_RESUMABLE",
                objProvider: {
                  provider: "UPLOAD_TYPE_UNKNOWN"
                }
            }
          } 
          // 这里简单处理，带冒号的就就当做是磁力链接
          else if(url.indexOf(':') !== -1) {
            hasTask = true
            postData = {
              kind: "drive#file",
              name: "",
              parent_id: route.params.id || '',
              upload_type: "UPLOAD_TYPE_URL",
              url: {
                url: url
              },
              params: {
                with_thumbnail:"true",
                from:"manual"
              },
              folder_type: "DOWNLOAD"
            }
          } 
          // 其他认为是`新文件夹名称`
          else {
            hasHash = true
            postData = {
              "kind": "drive#folder",
              "parent_id": route.params.id || '',
              "name": url
            }
          }
          showAddUrl.value = false
          http.post('https://api-drive.mypikpak.com/drive/v1/files', postData)
            .then((res:any) => {
              if(res.data.upload_type === 'UPLOAD_TYPE_UNKNOWN' || !isPikpakLink(url)) {
                window.$message.success('添加成功' , { duration: 1000 })
              }
            })
            .finally(() => {
              successLength++
              if(successLength === urlList.length) {
                newUrl.value = ''
                if(hasTask) {
                  taskRef.value.getTask()
                }
                if(hasHash) {
                  pageToken.value = ''
                  getFileList()
                }
              }
            })
        } else {
          successLength++
        }
      })
    }
    const deleteFile = (id:string | string[]) => {
      http.post('https://api-drive.mypikpak.com/drive/v1/files:batchTrash', {
        ids: typeof id === 'string' ? [id] : id
      })
        .then(() => {
          window.$message.success('删除成功' , { duration: 1000 })
          pageToken.value = ''
          if(typeof id === 'object') {
            checkedRowKeys.value = []
          }
          getFileList()
        })
    }
    const showCopyFail = ref(false)
    const copyValue = ref('')
    const copy = (value:string) => {
      nextTick(() => {
        const fakeElement = document.createElement('button')
        const clipboard = new ClipboardJS(fakeElement, {
          text: () => value,
          action: () => 'copy',
        })
        clipboard.on('success', (e) => {
          window.$message.success('复制成功' , { duration: 1000 })
          clipboard.destroy()
        })
        clipboard.on('error', (e) => {
          window.$message.error('复制失败，您可以F12打开控制台手动复制，或手动复制弹窗输入框')
          showCopyFail.value = true
          copyValue.value = value
          console.log(e.text)
          clipboard.destroy()
        })
        fakeElement.click()
      })
    }
    const copyAll = async () => {
      let text = ''
      if(allLoding.value) {
        return false
      }
      await getAllFile('分享秒传')
      for(let i in downFileList.value) {
        const item = downFileList.value[i]
        if(nRef.value) {
          nRef.value.content = nRef.value.content + '\r\n' + '获取' + item.parent + '/' + item.name + '成功'
        }
        text = text + `PikPak://${item.name}|${item.size}|${item.hash}` + '\n'
      }
      copy(text)
      setTimeout(() => {
        allLoding.value = false
        nRef.value?.destroy()
      }, 1000);
    }
    const notification = useNotification()
    const allLoding = ref(false)
    const nRef = ref<NotificationReactive>()
    const getAllFile = async (title?:string) => {
      downFileList.value = []
      allLoding.value = true
      nRef.value = notification.create({
        title: title || '推送到Aria2',
        closable: false,
        content: '正在获取全部文件列表'
      })
      const checkedRowKeysCopy = JSON.parse(JSON.stringify(checkedRowKeys.value))
      checkedRowKeys.value = []
      for(let i in filesList.value) {
        const item = filesList.value[i]
        if(checkedRowKeysCopy.indexOf(item.id) !== -1) {
          if(item.kind === 'drive#file') {
            downFileList.value.push({
              id: item.id,
              name: item.name,
              parent: '',
              size: item.size,
              hash: item.hash
            })
          } else {
            await getFloderFile(item.id, '', item.name)
          }
        }
      }
      nRef.value.content = '共获取到' + downFileList.value.length + '个文件'
    }
    const aria2All = async () => {
       if(!aria2Data.value || !aria2Data.value.host) {
       checkedRowKeys.value = []
       window.$message.error("未设置Aria2远程地址")
       return
       }
      if(allLoding.value) {
        return false
      }
      await getAllFile()
      if(!aria2Dir.value && aria2Data.value.dir) {
        await getAria2Dir()
      }
      const postOne =  () => {
        getFile(downFileList.value[0].id)
          .then(async res => {
            const data:any = downFileList.value.shift()
            await aria2Post(res, data.parent)
            if(nRef.value?.content) {
              nRef.value.content = nRef.value?.content + '\r\n' + '推送' + data.parent + '/' + data.name + '成功'
            }
            if(downFileList.value.length) {
              setTimeout(() => {
                postOne()
              }, 3000)
            } else {
              setTimeout(() => {
                nRef.value?.destroy()
                allLoding.value = false
              }, 1000);
            }
          })
      }
      postOne()
    }
  
    const downFile = (id:string) => {
      getFile(id)
        .then((info:any) => {
          streamSaver.mitm = 'mitm.html'
          const fileStream = streamSaver.createWriteStream(info.data.name)
          const url = refineDownloadUrl(downloadConfig.value, pickBestUrl(info.data))
          fetch(url).then((res:any) => {
            if(!window.$downId) {
              window.$downId = []
            }
            window.$downId.push(id)
            const readableStream = res.body
            // more optimized
            if (window.WritableStream && readableStream?.pipeTo) {
              return readableStream.pipeTo(fileStream)
                .then(() => {
                  window.$downId.splice(window.$downId.indexOf(id), 1)
                })
            }
  
            const writer = fileStream.getWriter()
  
            const reader = res.body.getReader()
            const pump = () => reader.read()
              .then((res:any) => {
                if(res.done) {
                  writer.close()
                } else {
                  writer.write(res.value).then(pump)
                }
              })
  
            pump()
          })
        })
    }
    const aria2Dir = ref()
    const getAria2Dir = () => {
      let postData:any = {
          id:'',
          jsonrpc:'2.0',
          method:'aria2.getGlobalOption',
          params:[
          ]
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
          aria2Dir.value = res?.result?.dir || ''
        })
    }
    const aria2Post = (res:any, dir?:string) => {
      let urls:Array<string> = []
      let filename: string
  
      if (Array.isArray(res)) {
        filename = res[0].data.name
        for (const item of res) {
          urls.push(pickBestUrl(item.data))
        }
      } else {
        urls.push(pickBestUrl(res.data))
        filename = res.data.name
      }
  
      const isBuff = aria2Data.value.batchUrlNum > 1
  
      if (!isBuff) {
        // -999(或小于-1) 表示不进行`服务器序号替换`处理
        urls = urls.map(url => refineAria2DownloadUrl(aria2Data.value, url, -999))
      } else {
        if (urls.length === 1) {
          urls = new Array(aria2Data.value.batchUrlNum).fill(urls[0])
        }
        urls = urls.map((url, k) => refineAria2DownloadUrl(aria2Data.value, url, k - 1))
      }
  
      console.log('[urls]', urls)
  
      const params: any = [urls, { out: filename }]
      if (aria2Data.value.restrictConnections) {
        // `split`: 一个链接只会有一个线程，不会有多余的线程，比下面的参数安全一些。
        params[1]['split'] = urls.length.toString()
  
        // `max-connection-per-server`: 一个链接有多个线程，
        //    但是只会使用前N个线程(N=推送的链接数量)，剩下的是`waiting`状态，不清楚这些有没有发送请求，如果有，那429风险大一些。
        // params[1]['max-connection-per-server'] = urls.length.toString()
  
        // 看来叠加下载这个方式不太可行，做了上面的限制，还是很容易就429！
        // 或者只能少量叠加，比如2~3个链接，但意义就不大了...
      }
  
      let postData:any = {
          id:'',
          jsonrpc:'2.0',
          method:'aria2.addUri',
          params,
      }
      if(dir && aria2Dir.value) {
        postData.params[1].dir = aria2Dir.value + '/' + dir
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
            window.$message.success('推送成功' , { duration: 1000 })
          }
        })
        .catch(error => console.error('Error:', error))
    }
    const scrollHandle = (e:any) =>  {
      if(e.target.offsetHeight + e.target.scrollTop >= e.target.scrollHeight - 30) {
        if(pageToken.value && !loading.value) {
          getFileList()
        }
      }
    }
    
    const batchMoveAll = (items:object) => {
      let text:string[] = []
      filesList.value.forEach((item:FileInfo) => {
        if(checkedRowKeys.value.indexOf(item.id) !== -1) {
         text.push(item.id)
        }
      })
      batchMove(text)
      checkedRowKeys.value = []
    }
    const batchCopyAll = (items:object) => {
      let text:string[] = []
      filesList.value.forEach((item:FileInfo) => {
        if(checkedRowKeys.value.indexOf(item.id) !== -1) {
         text.push(item.id)
        }
      })
      batchCopy(text)
      checkedRowKeys.value = []
    }
    const moveFiles = ref()
    const batchMove = (items:object) => {
      moveFiles.value = items
      window.localStorage.setItem('pikpakMoveFiles', JSON.stringify(items))
      window.$message.success('剪切成功，请点击页面右上方粘贴按钮' , { duration: 1000 })
    }
    const copyFiles = ref()
    const batchCopy = (items:object) => {
      copyFiles.value = items
      window.localStorage.setItem('pikpakCopyFiles', JSON.stringify(items))
      window.$message.success('复制成功，请点击页面右上方粘贴按钮' , { duration: 1000 })
    }
    const movePost = (e: any) => {
      if (e === 'cancel') {
        window.localStorage.removeItem('pikpakMoveFiles')
        window.$message.success('已取消' , { duration: 1000 })
        moveFiles.value = []
        return
      }
      http.post('https://api-drive.mypikpak.com/drive/v1/files:batchMove',{
        "to":{
          "parent_id": route.params.id || ''
        },
        "ids": moveFiles.value
      })
        .then((res:any) => {
          if (res.data.error) {
            window.$message.error(res.data.error_description + res.data.error_details[0].detail);
            return
          }
          pageToken.value = ''
          getFileList()
          window.$message.success('剪切成功' , { duration: 1000 })
          moveFiles.value = []
          window.localStorage.removeItem('pikpakMoveFiles')
        })
    }
    const copyPost = (e: any) => {
      if (e === 'cancel') {
        window.localStorage.removeItem('pikpakCopyFiles')
        window.$message.success('已取消' , { duration: 1000 })
        copyFiles.value = []
        return
      }
      http.post('https://api-drive.mypikpak.com/drive/v1/files:batchCopy',{
        "to":{
          "parent_id": route.params.id || ''
        },
        "ids": copyFiles.value
      })
        .then((res:any) => {
          if (res.data.error) {
            window.$message.error(res.data.error_description + res.data.error_details[0].detail);
            return
          }
          pageToken.value = ''
          getFileList()
          window.$message.success('复制成功' , { duration: 1000 })
          copyFiles.value = []
          window.localStorage.removeItem('pikpakCopyFiles')
        })
    }
    const nameModelSHow = (row:any) => {
      newName.value = {
        id: row.id,
        value: row.name
      }
      showName.value = true
    }
    const showName = ref(false)
    const newName = ref<{
      id: string,
      value: string
    } | null>()
    const namePost = () => {
      http.patch('https://api-drive.mypikpak.com/drive/v1/files/' + newName.value?.id, {
        name: newName.value?.value
      })
        .then(() => {
          getFileList()
          window.$message.success('修改成功' , { duration: 1000 })
          newName.value = null
          showName.value = false
        })
    }
    const downFileList = ref<{[key:string]:any}[]>([])
    const getFloderFile = async (id?:string, page?:string,parent?:string) => {
      const res:any = await http.get('https://api-drive.mypikpak.com/drive/v1/files', {
        params: {
          parent_id: id || undefined,
          thumbnail_size: 'SIZE_LARGE',
          with_audit: true,
          page_token: page || undefined,
          filters: '{"phase":{"eq":"PHASE_TYPE_COMPLETE"},"trashed":{"eq":false}}'
        }
      })
      const {files, next_page_token} = res.data
      if(next_page_token) {
        await getFloderFile(id, next_page_token, parent)
      }
      for(let i in files) {
        const item = files[i]
        if(item.kind === 'drive#folder') {
           await getFloderFile(item.id, '', (parent ? (parent + '/') :  '') + item.name)
        } else {
          downFileList.value.push({
            name: item.name,
            id: item.id,
            parent: parent || '',
            size: item.size,
            hash: item.hash
          })
        }
      }
      return 1
    }
    const menuTypeList = ref([
      {
        label: "链接",
        value: 'a',
      },
      {
        label: "复制",
        value: 'copy',
      },
    ])
    const menuTextList = ref({
      web_content_link: '链接',
      name: '名称',
      size: '大小',
      hash: '文件HASH值'
    })
    const newMenu = ref<{
      type: string,
      content: string,
      name: string
    }>({
      type: 'a',
      content: '',
      name: ''
    })
    const showUserMenu = ref(false)
    const userMenu = ref<typeof newMenu.value[]>([])
    const addUserMenu = () => {
      userMenu.value.push(JSON.parse(JSON.stringify(newMenu.value)))
      newMenu.value = {
        type: 'a',
        content: '',
        name: ''
      }
      window.localStorage.setItem('pikpakUserMenu', JSON.stringify(userMenu.value))
    }
    const removeUserMenu = (key:number) => {
      userMenu.value.splice(key, 1)
      window.localStorage.setItem('pikpakUserMenu', JSON.stringify(userMenu.value))
    }
  </script>
  
  <style>
  
  .header {
    height: 40px;
    display: flex;
    align-items: center;
    margin-bottom: 24px;
    justify-content: space-between;
    white-space: nowrap;
    flex-shrink: 0;
    font-size: 16px;
  }
  .header .title {
    flex: 1;
    width: 0;
    text-overflow: ellipsis;
    margin-right: 20px;
  }
  .header .action {
    font-size: 24px;
  }
  
  .n-data-table-td {
    cursor: pointer;
  }
  .n-data-table-td.modified_time,.n-data-table-th.modified_time {
    color: rgba(37, 38, 43, 0.5);
  }
  .n-data-table-td.size,.n-data-table-th.szie {
    color: rgba(37, 38, 43, 0.5);
  }
  .file-info {
    display: flex;
    align-items: center;
  }
  .file-info .title {
    flex: 1;
    width: 0;
  }
  .file-info .action {
    display: none;
  }
  .list-page {
    padding: 40px;
  }
  @media(max-width: 968px) {
    .list-page {
      padding: 10px;
    }
  }
  .list-page .loading {
    margin-top: 20px;
    text-align: center;
    color: rgba(37, 38, 43, 0.5);
  }
  .list-page .loading .n-spin-body {
    vertical-align: middle;
    margin-right: 10px;
  }
  .list-page-files {
    padding-bottom: 0px;
    user-select: none;
  }
  .list-page-files .n-data-table-td .n-space .n-text{
    font-size: 12px;
  }
  .outer-wrapper {
    opacity: 0;
    position: absolute;
    left: 50%;
    bottom: 52px;
    transform: translateX(-50%);
    z-index: 5;
    transition: opacity 0.3s ease;
  }
  .outer-wrapper.static {
    animation: move-down ease 0.3s;
  }
  .outer-wrapper.show {
    opacity: 1;
  }
  .outer-wrapper.show.static {
    animation: move-up ease 0.3s;
  }
  .toolbar-wrapper {
    display: -ms-flexbox;
    display: flex;
    align-items: center;
    padding: 8px 16px;
    border-radius: 10px;
    border: 1px solid #84858d33;
    background: #000;
    overflow: visible;
    user-select: none;
    box-shadow: 0 0 1px 1px rgba(28, 28, 32, 0.05),
      0 8px 24px rgba(28, 28, 32, 0.12);
  }
  .toolbar-item {
    border-radius: 5px;
    padding: 6px;
    font-size: 18px;
    cursor: pointer;
    transition: background 0.3s ease;
    color: #fff;
    margin-left: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .toolbar-item:first-child {
    margin-left: 0;
  }
  .tool-icon {
    font-size: 18px;
  }
  @keyframes move-down {
    0% {
      bottom: 52px;
    }
    100% {
      bottom: -52px;
    }
  }
  @keyframes move-up {
    0% {
      bottom: -52px;
    }
    100% {
      bottom: 52px;
    }
  }
  </style>
  
  <style lang="scss">
  .list-page {
    .n-breadcrumb ul {
      display: flex;
      max-width: 90%;
      .n-breadcrumb-item {
        display: inline-flex;
        min-width: 0;
        .n-breadcrumb-item__link {
          max-width: 240px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        &:nth-child(1),
        &:nth-last-child(1) {
          //background: rgb(67, 211, 27);
          flex-shrink: 0;
        }
      }
    }
  }
  
  .n-card-header__extra {
    .n-icon {
      cursor: pointer;
    }
  }
  </style>
