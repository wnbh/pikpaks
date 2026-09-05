<template>
  <div class="list-page">
    <div class="header">
      <div class="title n-ellipsis">
        <n-breadcrumb separator=">">
          <n-breadcrumb-item>
            <router-link to="">我的分享</router-link>
          </n-breadcrumb-item>
        </n-breadcrumb>
      </div>
    </div>
    <n-data-table
      v-model:checked-row-keys="checkedRowKeys"
      :row-key="(row) => row.share_id"
      :data="sharelist"
      size="small"
      :columns="columns"
      :bordered="false"
      max-height="calc(100vh - 230px)"
      @scroll="scrollHandle"
      :row-props="rowProps"
    ></n-data-table>
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
    <div class="loading" v-if="loading"><n-spin size="small" />加载中</div>
    <div class="outer-wrapper static show" v-if="checkedRowKeys.length">
      <div class="toolbar-wrapper">
        <div class="toolbar-item" @click="closeshareall(checkedRowKeys)">
          <n-tooltip>
            <template #trigger>
              <n-icon>
                <IconShareOff />
              </n-icon>
            </template>
            取消分享
          </n-tooltip>
        </div>
      </div>
    </div>

    <!--复制失败界面-->
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

    <!--分享信息界面-->
    <n-modal v-model:show="showShareMenu">
      <n-card style="width: 350px" :bordered="false" size="small">
        <template #cover>
          <img
            v-if="fileInfo.thumbnail_link"
            style="height: 197px; object-fit: cover"
            :src="fileInfo.thumbnail_link"
          />
          <img
            v-else
            style="height: 197px; object-fit: cover"
            :src="fileInfo.icon_link"
          />
        </template>
        <n-tabs
          default-value="info"
          size="large"
          animated
          pane-wrapper-style="margin: 0 -4px"
          pane-style="padding-left: 4px; padding-right: 4px; box-sizing: border-box;"
        >
          <n-tab-pane name="info" tab="信息">
            <n-form>
              <n-card class="infocard" embedded :bordered="false">
                <n-ellipsis>标题：{{ fileInfo.title }}</n-ellipsis>
                <div v-if="fileInfo.share_status_text">
                  有效期：{{ fileInfo.share_status_text }}
                </div>
                <div v-else>
                  <div v-if="fileInfo.expiration_at == null">
                    有效期：永久有效
                  </div>
                  <div v-else>
                    <n-ellipsis
                      >有效期：{{ fileInfo.expiration_at }}</n-ellipsis
                    >
                  </div>
                </div>
                <div v-if="fileInfo.pass_code">
                  密码：{{ fileInfo.pass_code }}
                </div>
                <div v-else>密码：无密码</div>
                <div>浏览次数：{{ fileInfo.view_count }}</div>
                <div>保存次数：{{ fileInfo.restore_count }}</div>
                <div v-if="fileInfo.restore_limit == null">
                  转存限制：无限次
                </div>
                <div v-else>转存限制：{{ fileInfo.restore_limit }}次</div>
                <n-ellipsis>分享链接：{{ fileInfo.share_url }}</n-ellipsis>
              </n-card>
            </n-form>
            <n-button type="primary" block @click="showShareMenu = false">
              关闭
            </n-button>
          </n-tab-pane>
          <n-tab-pane name="change" tab="修改">
            <n-form
              label-width="auto"
              label-align="left"
              label-placement="left"
            >
              <n-form-item label="转存次数:">
                <n-input-number
                  v-model:value="fileInfo.restore_limit"
                  placeholder="无限次"
                  size="small"
                  clearable
                  :min="1"
                  :style="{ width: '240px' }"
                />
              </n-form-item>
              <n-form-item label="提取密码:">
                <n-input
                  v-model:value="fileInfo.pass_code"
                  minlength="4"
                  maxlength="10"
                  show-count
                  type="text"
                  size="small"
                  placeholder="公开链接"
                  :allow-input="allowinput"
                  clearable
                ></n-input>
              </n-form-item>
              <n-form-item label="到期时间:">
                <n-date-picker
                  v-model:formatted-value="fileInfo.expiration_at"
                  placeholder="永久有效"
                  size="small"
                  type="datetime"
                  input-readonly
                  clearable
                  format="yyyy-MM-dd'T'HH:mm:ss.SSSxxx"
                  :style="{ width: '340px' }"
                />
              </n-form-item>
            </n-form>
            <n-button type="primary" block @click="changeshare">修改</n-button>
          </n-tab-pane>
        </n-tabs>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted, nextTick } from "vue";
import http from "../utils/axios";
import {
  DataTableColumns,
  NDataTable,
  NTime,
  NBreadcrumb,
  NBreadcrumbItem,
  NIcon,
  NTooltip,
  NSpin,
  NImage,
  NModal,
  NCard,
  NDropdown,
  DropdownOption,
  useDialog,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NDatePicker,
  NButton,
  NTabs,
  NTabPane,
  NEllipsis,
} from "naive-ui";
import { byteConvert } from "../utils";
import ClipboardJS from 'clipboard';
import { IconShareOff, IconCircleX } from "@tabler/icons-vue";

const smallColums = ref<DataTableColumns>([
  {
    title: "创建时间",
    key: "create_time",
    sorter: "default",
    render: (row) => {
      return h(NTime, {
        time: new Date(String(row.create_time) || ""),
        format: "yy-MM-dd HH:mm:ss.SSS",
      });
    },
    className: "create_time",
    width: 170,
  },
]);
const columns = ref<DataTableColumns>([
  {
    type: "selection",
  },
  {
    title: "名称",
    key: "title",
    //合并此列表头与下一列表头
    titleColSpan: 2,
    //根据key的值来决定对什么排序
    sorter: "default",
    render: (row: any) => {
      if (
        row.params.mime_type.indexOf("video") != -1 ||
        row.params.mime_type.indexOf("image") != -1
      ) {
        return h(NImage, {
          width: 28,
          height: 28,
          src: row.thumbnail_link || row.icon_link,
        });
      } else {
        return h("img", {
          width: 28,
          height: 28,
          src: row.thumbnail_link || row.icon_link,
        });
      }
    },
    width: 48,
  },
  {
    title: "名称",
    key: "title",
    sorter: "default",
    render: (row: any) => {
      return h(
        "div",
        {
          class: "file-info",
          onClick: () => {
            fileInfo.value = row;
            if (fileInfo.value.restore_limit === "-1") {
              fileInfo.value.restore_limit = undefined;
            }
            if (fileInfo.value.expiration_at == "-1") {
              fileInfo.value.expiration_at = undefined;
            }
            showShareMenu.value = true;
          },
        },
        [
          h(
            "text",
            {
              class: "title",
            },
            {
              default: () => String(row.title),
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
    key: "size",
    sorter: (rowA: any, rowB: any) => {
      return rowA.file_size - rowB.file_size;
    },
    render: (row: any) =>
      Number(row.file_size) > 0 ? byteConvert(Number(row.file_size)) : "",
    className: "size",
    width: 100,
  },
]);
const getMenu = () => {
  const options: DropdownOption[] = [
    {
      label: "复制链接",
      key: "copylink",
    },
    {
      label: "取消分享",
      key: "closeshare",
    },
  ];
  return options;
};
const fileInfo = ref();
const showDropdown = ref(false);
const dialog = useDialog();
const handleSelect = (key: string) => {
  switch (key) {
    case "copylink":
      let link = window.location.origin + "/#/s/" + fileInfo.value.share_id + "/" + fileInfo.value.pass_code;
      copy(link);
      break;
    case "closeshare":
      dialog.warning({
        title: "警告",
        content: "确定取消分享:\n" + fileInfo.value.title + "？",
        positiveText: "确定",
        negativeText: "不确定",
        onPositiveClick: () => {
          closeshare();
        },
      });
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

const pageToken = ref();
const sharelist = ref();
const getShare = () => {
  loading.value = true;
  http
    .get("https://api-drive.mypikpak.com/drive/v1/share/list", {
      params: {
        thumbnail_size: "SIZE_LARGE",
        limit: 100,
        page_token: pageToken.value || undefined,
      },
    })
    .then((res: any) => {
      const { data } = res;
      if (!pageToken.value) {
        sharelist.value = [];
      }
      sharelist.value = sharelist.value.concat(data.data);
      pageToken.value = data.next_page_token;
    })
    .finally(() => {
      loading.value = false;
    });
};

const showShareMenu = ref(false);
const allowinput = (value: string) => {
  return !value || /^[A-Za-z0-9]+$/.test(value);
};
const changeshare = () => {
  let pass_code_option = "NOT_REQUIRED";
  let custom_pass_code = undefined;
  let restore_limit = fileInfo.value.restore_limit;
  let expiration_at = fileInfo.value.expiration_at;
  if (fileInfo.value.pass_code !== "") {
    pass_code_option = "REQUIRED";
    custom_pass_code = fileInfo.value.pass_code;
  }
  if (fileInfo.value.restore_limit == null) {
    restore_limit = "-1";
  }
  if (fileInfo.value.expiration_at == undefined) {
    expiration_at = "-1";
  }
  if (
    "0" < fileInfo.value.pass_code.length &&
    fileInfo.value.pass_code.length < "4"
  ) {
    window.$message.warning("密码不能低于4位");
  } else {
    http
      .patch("https://api-drive.mypikpak.com/drive/v1/share", {
        custom_pass_code: custom_pass_code,
        pass_code_option: pass_code_option,
        restore_limit: restore_limit,
        expiration_at: expiration_at,
        share_id: fileInfo.value.share_id,
      })
      .then((res) => {
        window.$message.success('修改成功' , { duration: 1000 })
        console.log(res.data);
        setTimeout(function () {
          getShare();
          showShareMenu.value = false;
        }, 500);
      });
  }
};
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
const closeshare = () => {
  let ids: string[] = [];
  ids.push(fileInfo.value.share_id);
  http
    .post("https://api-drive.mypikpak.com/drive/v1/share:batchDelete", {
      ids: ids,
    })
    .then((res) => {
      window.$message.success('取消分享成功' , { duration: 1000 })
      console.log(res.data);
      setTimeout(function () {
        getShare();
      }, 500);
    });
};
const checkedRowKeys = ref<string[]>([])
const closeshareall = (id:string | string[]) => {
  http.post('https://api-drive.mypikpak.com/drive/v1/share:batchDelete', {
    ids: typeof id === 'string' ? [id] : id
  })
  .then(() => {
    window.$message.success('取消分享成功' , { duration: 1000 })
    if(typeof id === 'object') {
      checkedRowKeys.value = []
    }
    setTimeout(function () {
      getShare();
    }, 500);
  })
}

const loading = ref(false);
const scrollHandle = (e: any) => {
  if (e.target.offsetHeight - e.target.scrollTop < 30) {
    if (pageToken.value && !loading.value) {
      getShare();
    }
  }
};
onMounted(() => {
  const width = document.body.clientWidth;
  if (width > 968) {
    columns.value.splice(3, 0, ...smallColums.value);
  }
  checkedRowKeys.value = [];
  getShare();
});
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
.n-data-table-td.create_time,
.n-data-table-th.create_time {
  color: rgba(34, 34, 34, 0.5);
}
.n-data-table-td.size,
.n-data-table-th.szie {
  color: rgba(34, 34, 34, 0.5);
}
.file-info {
  display: flex;
  align-items: center;
}
.file-info img {
  width: 28px;
  height: 28px;
  margin-right: 20px;
}
.file-info .title {
  flex: 1;
  width: 0;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.file-info .action {
  display: none;
}
.list-page {
  padding: 40px;
  user-select: none;
}
@media (max-width: 968px) {
  .list-page {
    padding: 10px;
    user-select: none;
  }
}
.list-page .loading {
  margin-top: 20px;
  text-align: center;
  color: rgba(37, 38, 43, 0.5);
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
  border: 1px solid #84848450;
  background: #000;
  overflow: visible;
  user-select: none;
  box-shadow:
    0 0 1px 1px rgba(28, 28, 28, 0.05),
    0 8px 24px rgba(28, 28, 28, 0.12);
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
.infocard {
  margin-bottom: 1px;
}
.infocard .ellipsis {
  text-overflow: ellipsis; /*对溢出部分加上...*/
  overflow: hidden; /*隐藏溢出部分*/
  white-space: nowrap; /*强制单行显示*/
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
