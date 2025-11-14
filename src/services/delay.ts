import { delayProxyByName, type ProxyDelay } from "tauri-plugin-mihomo-api";

const hashKey = (name: string, group: string) => `${group ?? ""}::${name}`;

export interface DelayUpdate {
  delay: number;
  updatedAt: number;
}

class DelayManager {
  // 不缓存延迟值，每次都是实时测试
  private urlMap = new Map<string, string>();
  private listenerMap = new Map<string, (update: DelayUpdate) => void>();

  setUrl(group: string, url: string) {
    this.urlMap.set(group, url);
  }

  getUrl(group: string) {
    const url = this.urlMap.get(group);
    // 默认使用 Cloudflare 的测试URL
    return url || "https://cp.cloudflare.com/generate_204";
  }

  setListener(
    name: string,
    group: string,
    listener: (update: DelayUpdate) => void,
  ) {
    const key = hashKey(name, group);
    this.listenerMap.set(key, listener);
  }

  removeListener(name: string, group: string) {
    const key = hashKey(name, group);
    this.listenerMap.delete(key);
  }

  setDelay(
    name: string,
    group: string,
    delay: number,
  ): DelayUpdate {
    const key = hashKey(name, group);
    const update: DelayUpdate = {
      delay,
      updatedAt: Date.now(),
    };

    // 直接通知监听器，不缓存
    const listener = this.listenerMap.get(key);
    if (listener) {
      // 使用 setTimeout 异步通知，避免阻塞
      setTimeout(() => {
        try {
          listener(update);
        } catch (error) {
          console.error(`[DelayManager] 通知延迟监听器失败: ${key}`, error);
        }
      }, 0);
    }

    return update;
  }

  async checkDelay(
    name: string,
    group: string,
    timeout: number,
  ): Promise<DelayUpdate> {
    console.log(
      `[DelayManager] 开始测试延迟，代理: ${name}, 组: ${group}, 超时: ${timeout}ms`,
    );

    // 先将状态设置为测试中
    this.setDelay(name, group, -2);

    let delay = -1;
    const startTime = Date.now();

    try {
      const url = this.getUrl(group);
      console.log(`[DelayManager] 调用API测试延迟，代理: ${name}, URL: ${url}`);

      // 设置超时处理
      const timeoutPromise = new Promise<ProxyDelay>((resolve) => {
        setTimeout(() => resolve({ delay: 0 }), timeout);
      });

      // 使用Promise.race来实现超时控制
      const result = await Promise.race([
        delayProxyByName(name, url, timeout),
        timeoutPromise,
      ]);

      // 确保至少显示500ms的加载动画
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 500) {
        await new Promise((resolve) => setTimeout(resolve, 500 - elapsedTime));
      }

      delay = result.delay;
      console.log(
        `[DelayManager] 延迟测试完成，代理: ${name}, 结果: ${delay}ms`,
      );
    } catch (error) {
      // 确保至少显示500ms的加载动画
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.error(`[DelayManager] 延迟测试出错，代理: ${name}`, error);
      delay = 1e6; // error
    }

    return this.setDelay(name, group, delay);
  }

  async checkListDelay(
    nameList: string[],
    group: string,
    timeout: number,
    concurrency = 36,
  ) {
    console.log(
      `[DelayManager] 批量测试延迟开始，组: ${group}, 数量: ${nameList.length}, 并发数: ${concurrency}`,
    );
    const names = nameList.filter(Boolean);
    // 设置正在延迟测试中
    names.forEach((name) => this.setDelay(name, group, -2));

    let index = 0;
    const startTime = Date.now();

    const help = async (): Promise<void> => {
      const currName = names[index++];
      if (!currName) return;

      try {
        // 确保API调用前状态为测试中
        this.setDelay(currName, group, -2);

        // 添加一些随机延迟，避免所有请求同时发出和返回
        if (index > 1) {
          // 第一个不延迟，保持响应性
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 200),
          );
        }

        await this.checkDelay(currName, group, timeout);
      } catch (error) {
        console.error(
          `[DelayManager] 批量测试单个代理出错，代理: ${currName}`,
          error,
        );
        // 设置为错误状态
        this.setDelay(currName, group, 1e6);
      }

      return help();
    };

    // 限制并发数，避免发送太多请求
    const actualConcurrency = Math.min(concurrency, names.length, 10);
    console.log(`[DelayManager] 实际并发数: ${actualConcurrency}`);

    const promiseList: Promise<void>[] = [];
    for (let i = 0; i < actualConcurrency; i++) {
      promiseList.push(help());
    }

    await Promise.all(promiseList);
    const totalTime = Date.now() - startTime;
    console.log(
      `[DelayManager] 批量测试延迟完成，组: ${group}, 总耗时: ${totalTime}ms`,
    );
  }

  formatDelay(delay: number, timeout = 10000) {
    if (delay === -1) return "-";
    if (delay === -2) return "testing";
    if (delay === 0 || (delay >= timeout && delay <= 1e5)) return "Timeout";
    if (delay > 1e5) return "Error";
    return `${delay}`;
  }

  formatDelayColor(delay: number, timeout = 10000) {
    if (delay < 0) return "";
    if (delay === 0 || delay >= timeout) return "error.main";
    if (delay >= 10000) return "error.main";
    if (delay >= 400) return "warning.main";
    if (delay >= 250) return "primary.main";
    return "success.main";
  }
}

export default new DelayManager();

