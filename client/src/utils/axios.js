import axios from 'axios';

/**
 * @desc req 拦截器
 * */
axios.interceptors.request.use(req => {
	return req;
}, err => {
	return Promise.reject(err.request);
});
/**
 * @desc res 拦截器 axios
 * */
axios.interceptors.response.use(res => {
	if (res && res.data) {
		if (res.data.code === 0) {
			return res.data;
		} else {
			// 4003 等状态则跳回login 页面
			return Promise.reject(res.data);
		}
	}
	return res;
}, error => {
	return Promise.resolve(error.response);
});

export {axios};
