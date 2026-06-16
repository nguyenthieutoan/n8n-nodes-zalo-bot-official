# **Hướng dẫn Kiến trúc và Phát triển Node n8n Tùy biến cho Zalo Bot Platform**

## **Tổng quan Kiến trúc Zalo Bot Platform và Mô hình Xác thực**

Hệ sinh thái dịch vụ tin nhắn tự động trên nền tảng Zalo hiện hữu hai nhánh giải pháp chính là Zalo Official Account (OA) dành cho doanh nghiệp và Zalo Bot Platform dành cho các tác vụ tương tác cá nhân hoặc quy mô vừa và nhỏ1. Đối với các kỹ sư tích hợp hệ thống, việc phân biệt rạch ròi hai nhánh kiến trúc này là tối quan trọng nhằm lựa chọn đúng phương thức thiết kế nút (node) trên môi trường n8n2.  
Zalo OA truyền thống vận hành dựa trên cơ chế phân quyền OAuth v4, yêu cầu duy trì cặp mã khóa truy cập (Access Token) ngắn hạn và mã khóa làm mới (Refresh Token) có thời hạn tối đa 3 tháng1. Luồng quản lý mã khóa này đòi hỏi các dòng công việc phụ trợ phức tạp để liên tục làm mới tài nguyên kết nối5. Ngược lại, Zalo Bot Platform áp dụng mô hình kiến trúc tối giản tương tự như Telegram Bot API, sử dụng một mã thông báo dài hạn (long-lived token) duy nhất được định dạng theo cấu trúc {bot\_id}:{secret\_key} hoặc {bot\_id}:{access\_token}2. Mã thông báo này được cấp phát trực tiếp thông qua tài khoản quản lý Zalo Bot Manager và không tự động hết hạn, giúp giảm thiểu đáng kể chi phí hạ tầng và loại bỏ hoàn toàn các dòng công việc xoay vòng khóa2.

| Tiêu chí So sánh | Zalo Bot Platform (Dùng cho Node này) | Zalo Official Account (OA) API |
| :---- | :---- | :---- |
| **Đối tượng áp dụng** | Cá nhân, lập trình viên, doanh nghiệp nhỏ3 | Doanh nghiệp chính thức có pháp nhân1 |
| **Mô hình xác thực** | Token dài hạn duy nhất (bot\_id:secret\_key)2 | OAuth v4 (Access/Refresh Token luân phiên)1 |
| **Cơ chế thu thập dữ liệu** | Nhận đẩy Webhook hoặc Truy vấn dài tuần hoàn (Long Polling)8 | Webhook thông qua cấu hình ứng dụng Zalo Developer1 |
| **Khả năng tích hợp n8n** | Cực kỳ tinh gọn, không cần xử lý tiến trình Refresh Token2 | Đòi hỏi luồng quản lý token phức tạp, dễ bị ngắt kết nối5 |
| **Môi trường khởi tạo** | Ứng dụng quản lý "Zalo Bot Manager" ngay trong Zalo2 | Cổng thông tin Zalo Developers và kiểm duyệt hồ sơ1 |

Mô hình giao tiếp của Zalo Bot Platform dựa trên giao thức HTTP POST chuẩn hóa, sử dụng định dạng dữ liệu truyền tải application/json xuyên suốt các tác vụ10. Việc gửi nhận dữ liệu trực tiếp qua điểm cuối API trung tâm tại https://bot-api.zaloplatforms.com/bot\<BOT\_TOKEN\>/\<METHOD\> giúp loại bỏ các rào cản về mặt thư viện liên kết, tạo điều kiện thuận lợi để xây dựng các yêu cầu trực tiếp thông qua các hàm tiện ích có sẵn của n8n10.

## **Đặc tả Chi tiết các Điểm cuối API của Zalo Bot Platform**

Để xây dựng một nút n8n có độ che phủ tính năng hoàn chỉnh, nhà phát triển cần lập bản đồ toàn bộ các điểm cuối API của nền tảng Zalo Bot vào cấu trúc Tác vụ (Operations) của nút2. Mỗi API yêu cầu các tham số đầu vào chuyên biệt và trả về các cấu trúc phản hồi dạng JSON mà nút n8n cần phân tích để chuyển tiếp sang các nút tiếp theo trong dòng công việc9.

| Điểm cuối (Endpoint) | Phương thức (HTTP Method) | Tham số Đầu vào (Request Body) | Cấu trúc Phản hồi Thành công (JSON) | Ý nghĩa Nghiệp vụ |
| :---- | :---- | :---- | :---- | :---- |
| /getMe | POST \[cite: 15\] | Không có tham số15 | { "ok": true, "result": { "id": "1459...", "account\_name": "bot.VDKy", "account\_type": "BASIC", "can\_join\_groups": false } } \[cite: 15\] | Xác thực tính hợp lệ của Token và lấy thông tin cơ bản của Bot15. |
| /getUpdates | POST \[cite: 8\] | timeout (String, mặc định "30")2 | { "ok": true, "result": \[ { "message\_id": "...", "event\_name": "message.text.received", "message": { ... } } \] } \[cite: 8, 9\] | Thu thập danh sách tin nhắn mới theo cơ chế truy vấn dài tuần hoàn8. |
| /setWebhook | POST \[cite: 12\] | url (String, bắt buộc HTTPS), secret\_token (String, 8-256 ký tự)9 | { "ok": true, "result": { "url": "https://...", "updated\_at": 1749538250568 } } \[cite: 9\] | Thiết lập địa chỉ URL nhận sự kiện thời gian thực từ hệ thống Zalo9. |
| /deleteWebhook | POST \[cite: 9\] | Không có tham số9 | { "ok": true, "result": { "url": "", "updated\_at": 1749538250568 } } \[cite: 9\] | Gỡ bỏ cấu hình Webhook hiện tại trên hệ thống máy chủ Zalo9. |
| /getWebhookInfo | POST \[cite: 9\] | Không có tham số9 | { "ok": true, "result": { "url": "https://...", "updated\_at": 1749633372026 } } \[cite: 9\] | Truy vấn thông tin cấu hình chi tiết của Webhook đang hoạt động9. |
| /sendMessage | POST \[cite: 10\] | chat\_id (String), text (String), parse\_mode (String, tùy chọn), text\_styles (Array, tùy chọn)10 | { "ok": true, "result": { "message\_id": "82599fa...", "date": 1749632637199 } } \[cite: 10\] | Gửi tin nhắn văn bản (hỗ trợ định dạng Rich Text phong phú)10. |
| /sendPhoto | POST \[cite: 11\] | chat\_id (String), photo (String \- URL), caption (String, tùy chọn)11 | { "ok": true, "result": { "message\_id": "82599fa...", "date": 1749632637199 } } \[cite: 11\] | Gửi tin nhắn kèm hình ảnh hiển thị trực quan và chú thích văn bản11. |
| /sendChatAction | POST \[cite: 16\] | chat\_id (String), action (String \- ví dụ: "typing")16 | { "ok": true, "result": { "message\_id": "...", "date": 1749632637199 } } \[cite: 16\] | Gửi trạng thái hành động giả lập của bot đến người nhận16. |

### **Chi tiết về Tính năng Định dạng Văn bản Phong phú (Rich Text Formatting)**

Khi thực hiện tác vụ gửi tin nhắn thông qua /sendMessage, Zalo Bot Platform cung cấp một cơ chế định dạng mạnh mẽ, giúp nâng cao trải nghiệm thị giác của người dùng cuối10. Khả năng này được chia làm hai chế độ xử lý độc lập và loại trừ tương hỗ:

* **Chế độ parse\_mode**: Khi thuộc tính này được gán giá trị là markdown hoặc html, máy chủ Zalo sẽ tự động quét chuỗi văn bản thô trong trường text để tìm các ký tự đặc biệt hoặc các thẻ đánh dấu chuẩn10. Định dạng Markdown hỗ trợ các cú pháp cơ bản như chữ đậm ( hoặc \_\_), chữ nghiêng (\* hoặc \_), gạch ngang (\~\~), văn bản trích dẫn (\>), danh sách có thứ tự và không thứ tự, cũng như các bộ lọc màu chữ chuyên biệt như {red}...{/red} hoặc cỡ chữ lớn {big}...{/big}10. Định dạng HTML hỗ trợ các thẻ cơ bản như \<b\>, \<i\>, \<u\>, \<h1\> đến \<h6\>, và thuộc tính style="..." giới hạn trong hệ màu sắc và kích cỡ được Zalo phê duyệt10.  
* **Chế độ text\_styles**: Đây là chế độ định dạng hướng lập trình, nơi người dùng truyền vào một mảng chứa các đối tượng xác định tọa độ vùng định dạng10. Mỗi đối tượng cấu trúc bao gồm chỉ số khởi đầu (start) và độ dài vùng áp dụng (len) được đo bằng đơn vị mã UTF-16, kết hợp với mảng mã kiểu dáng st (ví dụ: b cho chữ đậm, i cho chữ nghiêng, c\_db342e cho màu chữ đỏ)10.

Quy tắc ưu tiên tối cao của hệ thống quy định rằng nếu cả hai thuộc tính cùng được truyền tải trong yêu cầu, parse\_mode sẽ được ưu tiên áp dụng tuyệt đối và cấu trúc mảng text\_styles sẽ hoàn toàn bị hệ thống bỏ qua10. Sự loại trừ này xuất phát từ việc tính toán vị trí hiển thị: parse\_mode thực hiện tính toán căn lề sau khi đã lọc bỏ các thẻ markup, trong khi text\_styles bắt buộc phải tham chiếu trực tiếp trên chỉ số chuỗi thô nguyên bản10. Trong thiết kế giao diện của nút n8n, việc xây dựng các bộ lọc điều kiện hiển thị (displayOptions) để ẩn/hiện các tùy chọn này tùy thuộc vào lựa chọn của người dùng là giải pháp tối ưu nhằm ngăn chặn các xung đột logic ngoài ý muốn10.

## **Kiến trúc Webhook và Cơ chế Ngăn ngừa Xung đột Hệ thống**

### **Nguyên lý Loại trừ Tương hỗ giữa Webhook và Long Polling**

Một trong những lỗi thiết kế hệ thống nghiêm trọng nhất khi phát triển ứng dụng tích hợp Zalo Bot là việc chạy song song hai cơ chế thu thập dữ liệu: Webhook và Long Polling2. Hệ thống máy chủ Zalo Bot được thiết kế để phân phối sự kiện theo một kênh duy nhất được cấu hình gần nhất2.  
Khi một nút kích hoạt n8n đăng ký thành công địa chỉ Webhook thông qua phương thức /setWebhook, hệ thống Zalo sẽ ghi nhận và định tuyến toàn bộ sự kiện theo thời gian thực tới địa chỉ HTTPS này2. Tuy nhiên, nếu xuất hiện bất kỳ yêu cầu gọi đến điểm cuối /getUpdates nào sử dụng cùng một mã thông báo (ví dụ, một SDK chạy ngầm từ một tiến trình kiểm thử của nhà phát triển hoặc một nút n8n khác chạy song song), máy chủ Zalo sẽ ngay lập tức xóa bỏ hoàn toàn địa chỉ Webhook đã đăng ký mà không đưa ra bất kỳ thông báo lỗi trực tiếp nào2.  
Sự cố xung đột này thường dẫn đến hiện tượng mất kết nối Webhook đột ngột trong vòng 15 giây mà không có bất kỳ dấu vết lỗi nào được ghi lại trong lịch sử thực thi của n8n17. Do đó, kiến trúc hệ thống bắt buộc phải đảm bảo sự cô lập tuyệt đối: một mã thông báo bot chỉ được gán duy nhất cho một luồng nhận sự kiện2.

### **Cấu trúc Dữ liệu Đẩy Webhook và Tiêu chuẩn Bảo mật**

Khi có tương tác từ phía người dùng, máy chủ Zalo sẽ chủ động gửi một yêu cầu HTTP POST có cấu trúc JSON chứa đầy đủ thông tin ngữ cảnh về sự kiện9. Tiêu đề HTTP của yêu cầu này luôn đính kèm tham số X-Bot-Api-Secret-Token chứa giá trị khóa bí mật mà nút n8n đã thiết lập trong cuộc gọi /setWebhook trước đó9. Việc xác thực sự trùng khớp của khóa bí mật này tại đầu nhận của n8n là bước bảo mật bắt buộc để ngăn chặn các cuộc tấn công giả mạo hoặc tiêm nhiễm dữ liệu từ các nguồn không xác định9.  
Cấu trúc JSON phản hồi từ Webhook luôn chứa một đối tượng gốc có giá trị "ok": true và một đối tượng "result" chứa thông tin chi tiết của sự kiện9. Đối tượng sự kiện này bao gồm các trường thông tin cốt lõi giúp định tuyến logic trong n8n3:

| Tên Sự kiện (event\_name) | Cấu trúc Dữ liệu Phân phối (Result Payload Structure) | Ý nghĩa Kỹ thuật và Nghiệp vụ |
| :---- | :---- | :---- |
| message.text.received \[cite: 9\] | { "event\_name": "message.text.received", "message": { "from": { "id", "display\_name", "is\_bot" }, "chat": { "id", "chat\_type": "PRIVATE" }, "text": "Nội dung văn bản", "message\_id", "date" } } \[cite: 9\] | Người dùng gửi một thông điệp dạng văn bản thuần túy9. Trường chat\_type có thể nhận giá trị PRIVATE hoặc GROUP (phiên bản Beta)9. |
| message.image.received \[cite: 9\] | { "event\_name": "message.image.received", "message": { "from": { ... }, "chat": { ... }, "photo": "https://...", "caption": "Mô tả ảnh nếu có", "message\_id", "date" } } \[cite: 9\] | Người dùng gửi một thông điệp hình ảnh9. Trường photo cung cấp đường dẫn URL trực tiếp tới tài nguyên ảnh đã lưu trữ trên máy chủ Zalo9. |
| message.sticker.received \[cite: 9\] | { "event\_name": "message.sticker.received", "message": { "from": { ... }, "chat": { ... }, "sticker": "ID\_Sticker", "url": "https://...", "message\_id", "date" } } \[cite: 9\] | Người dùng tương tác bằng nhãn dán biểu cảm9. ID của nhãn dán được đối chiếu với hệ thống lưu trữ nhãn dán công khai của Zalo9. |
| message.voice.received \[cite: 9\] | { "event\_name": "message.voice.received", "message": { "from": { ... }, "chat": { ... }, "voice\_url": "https://...", "message\_id", "date" } } \[cite: 9\] | Người dùng gửi một ghi âm tin nhắn thoại9. Trường voice\_url chứa liên kết đến tệp âm thanh định dạng nhị phân cần được tải xuống hoặc xử lý9. |
| message.unsupported.received \[cite: 9\] | { "event\_name": "message.unsupported.received", "message": { "from": { ... }, "chat": { ... }, "message\_id", "date" } } \[cite: 9\] | Cơ chế phòng vệ pháp lý đặc biệt của hệ thống Zalo9. Khi người gửi thuộc nhóm đối tượng cần bảo vệ thông tin đặc biệt (trẻ em, người khuyết tật), máy chủ Zalo sẽ ẩn toàn bộ nội dung tin nhắn thô và chỉ phân phối sự kiện cảnh báo này9. |

## **Thiết kế Mã nguồn và Giao diện Node Hành động (Action Node)**

### **Cấu trúc Dự án của Node Tùy biến n8n**

Để đóng gói một nút tùy biến chuẩn hóa có khả năng triển khai trên mọi môi trường n8n, dự án cần được tổ chức theo cấu trúc module khoa học2. Cấu trúc này phân tách rõ ràng phần mô tả giao diện hiển thị, cấu hình thông tin xác thực bảo mật và logic điều khiển cuộc gọi18.

| Tên Tệp tin | Vị trí Thư mục | Vai trò Kỹ thuật trong Hệ thống |
| :---- | :---- | :---- |
| package.json | / (Thư mục gốc) | Định nghĩa siêu dữ liệu của package, bao gồm các từ khóa định danh bắt buộc để n8n nhận diện nút như n8n-community-node-package19. |
| ZaloBotApi.credentials.ts | /credentials/ | Định nghĩa giao diện nhập liệu và cơ chế mã hóa mật khẩu cho mã thông báo bảo mật Zalo Bot18. |
| ZaloBot.node.ts | /nodes/ZaloBot/ | Tệp mã nguồn cốt lõi chứa cấu trúc giao diện UI (properties) và luồng xử lý yêu cầu API (execute)14. |
| MyLogo-dark.svg, MyLogo-light.svg | /icons/ | Các biểu tượng đồ họa tối ưu hóa cho chế độ hiển thị sáng và tối của giao diện thiết kế n8n20. |

### **Triển khai Mã nguồn Thông tin Xác thực (ZaloBotApi.credentials.ts)**

Tệp thông tin xác thực thực hiện nhiệm vụ khởi tạo khung nhập liệu mã thông báo của bot và triển khai phương thức kiểm tra kết nối thời gian thực18. Thuộc tính nhập liệu của mã thông báo cần được cấu hình dưới dạng chuỗi bảo mật có thuộc tính ẩn ký tự (password: true) nhằm tránh rò rỉ thông tin trên giao diện làm việc20.

TypeScript  
import {  
	ICredentialType,  
	INodeProperties,  
	ICredentialTestRequest,  
} from 'n8n-workflow';

export class ZaloBotApi implements ICredentialType {  
	name \= 'zaloBotApi';  
	displayName \= 'Zalo Bot API';  
	documentationUrl \= 'https://bot.zapps.me/docs';  
	properties: INodeProperties\[\] \= \[  
		{  
			displayName: 'Bot Token',  
			name: 'botToken',  
			type: 'string',  
			typeOptions: {  
				password: true,  
			},  
			default: '',  
			description: 'Mã thông báo của Bot được cấp từ Zalo Bot Manager có định dạng {bot\_id}:{secret\_key}',  
		},  
	\];

	test: ICredentialTestRequest \= {  
		request: {  
			baseURL: 'https://bot-api.zaloplatforms.com',  
			url: '/bot={{$credentials.botToken}}/getMe',  
			method: 'POST',  
		},  
	};  
}

### **Triển khai Mã nguồn Logic Hành động (ZaloBot.node.ts)**

Tệp hành động chính sử dụng kiến trúc khai báo tài nguyên (Resource) và tác vụ (Operation) để tạo ra trải nghiệm người dùng tự nhiên và trực quan nhất13. Toàn bộ các tham số đầu vào được ánh xạ thông qua các trường thuộc tính UI của n8n và sau đó được chuyển đổi thành cấu trúc JSON gửi tới máy chủ Zalo13.  
Đặc biệt, trong quá trình ánh xạ, nút cần tự động chuyển đổi các tên biến thân thiện với người dùng thành tên biến kỹ thuật tương ứng của API2. Một ví dụ điển hình là tác vụ gửi nhãn dán: giao diện UI hiển thị trường nhập liệu trực quan là stickerId nhằm giúp người dùng dễ hiểu, nhưng logic xử lý nội bộ của nút phải tự động ánh xạ giá trị này sang khóa "sticker" trong thân yêu cầu HTTP POST để phù hợp với định dạng yêu cầu của Zalo Bot API2.

TypeScript  
import {  
	IExecuteFunctions,  
	INodeExecutionData,  
	INodeType,  
	INodeTypeDescription,  
	NodeApiError,  
} from 'n8n-workflow';

export class ZaloBot implements INodeType {  
	description: INodeTypeDescription \= {  
		displayName: 'Zalo Bot',  
		name: 'zaloBot',  
		icon: 'file:../../icons/MyLogo-dark.svg',  
		group: \['transform'\],  
		version: 1,  
		description: 'Gửi tin nhắn, hình ảnh và quản lý tương tác trên nền tảng Zalo Bot',  
		defaults: {  
			name: 'Zalo Bot',  
		},  
		inputs: \['main'\],  
		outputs: \['main'\],  
		credentials: \[  
			{  
				name: 'zaloBotApi',  
				required: true,  
			},  
		\],  
		properties: \[  
			{  
				displayName: 'Resource',  
				name: 'resource',  
				type: 'options',  
				noDataExpression: true,  
				options: \[  
					{  
						name: 'Message',  
						value: 'message',  
					},  
					{  
						name: 'Bot Info',  
						value: 'botInfo',  
					},  
				\],  
				default: 'message',  
			},  
			// Tác vụ thuộc tài nguyên Message  
			{  
				displayName: 'Operation',  
				name: 'operation',  
				type: 'options',  
				noDataExpression: true,  
				displayOptions: {  
					show: {  
						resource: \['message'\],  
					},  
				},  
				options: \[  
					{  
						name: 'Send Text Message',  
						value: 'sendMessage',  
						description: 'Gửi thông điệp văn bản thô hoặc định dạng Rich Text',  
					},  
					{  
						name: 'Send Photo',  
						value: 'sendPhoto',  
						description: 'Gửi thông điệp chứa hình ảnh từ liên kết URL',  
					},  
					{  
						name: 'Send Sticker',  
						value: 'sendSticker',  
						description: 'Gửi nhãn dán biểu cảm từ hệ thống Zalo',  
					},  
				\],  
				default: 'sendMessage',  
			},  
			// Các thuộc tính nhập liệu chung cho Tác vụ Message  
			{  
				displayName: 'Chat ID',  
				name: 'chatId',  
				type: 'string',  
				required: true,  
				displayOptions: {  
					show: {  
						resource: \['message'\],  
					},  
				},  
				default: '',  
				description: 'ID của cuộc hội thoại hoặc người nhận tin nhắn',  
			},  
			{  
				displayName: 'Text',  
				name: 'text',  
				type: 'string',  
				required: true,  
				displayOptions: {  
					show: {  
						resource: \['message'\],  
						operation: \['sendMessage'\],  
					},  
				},  
				default: '',  
				description: 'Nội dung tin nhắn văn bản (tối đa 2000 ký tự)',  
			},  
			{  
				displayName: 'Parse Mode',  
				name: 'parseMode',  
				type: 'options',  
				options: \[  
					{ name: 'None (Plain Text)', value: 'none' },  
					{ name: 'Markdown', value: 'markdown' },  
					{ name: 'HTML', value: 'html' },  
				\],  
				displayOptions: {  
					show: {  
						resource: \['message'\],  
						operation: \['sendMessage'\],  
					},  
				},  
				default: 'none',  
				description: 'Chế độ phân tích định dạng hiển thị cho văn bản',  
			},  
			{  
				displayName: 'Photo URL',  
				name: 'photoUrl',  
				type: 'string',  
				required: true,  
				displayOptions: {  
					show: {  
						resource: \['message'\],  
						operation: \['sendPhoto'\],  
					},  
				},  
				default: '',  
				description: 'Đường dẫn URL chứa hình ảnh công khai cần gửi',  
			},  
			{  
				displayName: 'Caption',  
				name: 'caption',  
				type: 'string',  
				displayOptions: {  
					show: {  
						resource: \['message'\],  
						operation: \['sendPhoto'\],  
					},  
				},  
				default: '',  
				description: 'Nội dung văn bản mô tả đi kèm dưới hình ảnh',  
			},  
			{  
				displayName: 'Sticker ID',  
				name: 'stickerId',  
				type: 'string',  
				required: true,  
				displayOptions: {  
					show: {  
						resource: \['message'\],  
						operation: \['sendSticker'\],  
					},  
				},  
				default: '',  
				description: 'Mã định danh nhãn dán lấy từ thư viện stickers.zaloapp.com',  
			},  
		\],  
	};

	async execute(this: IExecuteFunctions): Promise\<INodeExecutionData\[\]\[\]\> {  
		const items \= this.getInputData();  
		const returnData: INodeExecutionData\[\] \= \[\];  
		const credentials \= await this.getCredentials('zaloBotApi');  
		const botToken \= credentials.botToken as string;  
		const baseUrl \= 'https://bot-api.zaloplatforms.com';

		for (let i \= 0; i \< items.length; i++) {  
			try {  
				const resource \= this.getNodeParameter('resource', i) as string;  
				const operation \= this.getNodeParameter('operation', i) as string;

				if (resource \=== 'message') {  
					const chatId \= this.getNodeParameter('chatId', i) as string;  
					let endpoint \= '';  
					let body: any \= { chat\_id: chatId };

					if (operation \=== 'sendMessage') {  
						endpoint \= \`/bot${botToken}/sendMessage\`;  
						const text \= this.getNodeParameter('text', i) as string;  
						const parseMode \= this.getNodeParameter('parseMode', i) as string;  
						body.text \= text;  
						if (parseMode \!== 'none') {  
							body.parse\_mode \= parseMode;  
						}  
					} else if (operation \=== 'sendPhoto') {  
						endpoint \= \`/bot${botToken}/sendPhoto\`;  
						const photoUrl \= this.getNodeParameter('photoUrl', i) as string;  
						const caption \= this.getNodeParameter('caption', i) as string;  
						body.photo \= photoUrl;  
						if (caption) {  
							body.caption \= caption;  
						}  
					} else if (operation \=== 'sendSticker') {  
						endpoint \= \`/bot${botToken}/sendSticker\`;  
						const stickerId \= this.getNodeParameter('stickerId', i) as string;  
						// Ánh xạ tự động: Thuộc tính giao diện n8n hiển thị stickerId nhưng API Zalo Bot yêu cầu khóa "sticker"  
						body.sticker \= stickerId;  
					}

					const options \= {  
						method: 'POST',  
						uri: \`${baseUrl}${endpoint}\`,  
						body,  
						json: true,  
					};

					const response \= await this.helpers.request(options);  
					  
					if (response.ok \=== false) {  
						throw new NodeApiError(this.getNode(), response);  
					}

					const executionData \= this.helpers.constructExecutionData(  
						{ json: response.result },  
						{ itemIndex: i }  
					);  
					returnData.push(...executionData);  
				}  
			} catch (error) {  
				if (this.continueOnFail()) {  
					returnData.push({ json: { error: error.message }, pairedItem: { item: i } });  
					continue;  
				}  
				throw error;  
			}  
		}

		return \[returnData\];  
	}  
}

## **Thiết kế Node Kích hoạt Webhook (ZaloBotTrigger)**

### **Nguyên lý Tự động hóa Đăng ký Vòng đời Webhook trên n8n**

Node kích hoạt (ZaloBotTrigger) được thiết kế để loại bỏ việc cấu hình thủ công phức tạp từ phía người dùng2. Bằng việc tận dụng đối tượng webhookMethods tích hợp sẵn trong cấu trúc của n8n, node có thể tự động giao tiếp với máy chủ Zalo để thực hiện quy trình đăng ký, gỡ bỏ và giám sát trạng thái Webhook2.

* **Hàm create (Đăng ký tự động)**: Khi người dùng chuyển trạng thái dòng công việc sang kích hoạt (Active), n8n sẽ tự động thực thi hàm này2. Hàm sẽ trích xuất địa chỉ URL Webhook do n8n cấp phát và tự động băm mã thông báo Bot Token bằng thuật toán SHA256 để tạo ra một chuỗi khóa bí mật dài 32 ký tự hệ thập lục phân2. Chuỗi này được lưu trữ trong bộ dữ liệu tĩnh của nút (Workflow Static Data)2 và gửi kèm trong yêu cầu /setWebhook tới Zalo2.  
* **Hàm delete (Dọn dẹp tài nguyên)**: Khi dòng công việc bị tạm dừng (Deactive) hoặc xóa bỏ, hàm này sẽ tự động gọi API /deleteWebhook để khôi phục trạng thái ban đầu của bot, giúp bot sẵn sàng cho các cấu hình hoặc môi trường phát triển khác2.  
* **Hàm checkExists (Cơ chế Tự chữa lành)**: Khi khởi động dòng công việc, n8n cần kiểm tra xem cấu hình Webhook trên máy chủ Zalo có trùng khớp với cấu hình hiện hành hay không17. Để thực hiện việc này một cách chính xác và tránh các lỗi lặp vòng vô hạn do sự khác biệt nhỏ về cấu trúc chuỗi, hàm cần chuẩn hóa địa chỉ URL bằng cách loại bỏ các ký tự gạch chéo cuối dòng trước khi so sánh17.

Chúng ta biểu diễn logic chuẩn hóa và so sánh địa chỉ Webhook bằng biểu thức logic sau:  
![][image1]  
![][image2]  
Nếu kết quả so sánh trả về giá trị sai (false), hệ thống sẽ tự động gọi chuỗi tác vụ hủy bỏ và tạo mới để tự sửa chữa cấu hình17.

### **Triển khai Mã nguồn Node Kích hoạt Webhook (ZaloBotTrigger.node.ts)**

TypeScript  
import {  
	IHookFunctions,  
	IWebhookFunctions,  
	INodeType,  
	INodeTypeDescription,  
	IWebhookResponseData,  
	NodeConnectionTypes,  
} from 'n8n-workflow';  
import { createHash } from 'crypto';

export class ZaloBotTrigger implements INodeType {  
	description: INodeTypeDescription \= {  
		displayName: 'Zalo Bot Trigger',  
		name: 'zaloBotTrigger',  
		icon: 'file:../../icons/MyLogo-dark.svg',  
		group: \['trigger'\],  
		version: 1,  
		description: 'Kích hoạt dòng công việc khi nhận sự kiện tin nhắn thời gian thực từ Zalo',  
		defaults: {  
			name: 'Zalo Bot Trigger',  
		},  
		inputs: \[\],  
		outputs: \[NodeConnectionTypes.Main\],  
		credentials: \[  
			{  
				name: 'zaloBotApi',  
				required: true,  
			},  
		\],  
		webhooks: \[  
			{  
				name: 'default',  
				httpMethod: 'POST',  
				responseMode: 'onReceived',  
				path: 'webhook',  
			},  
		\],  
		properties: \[\],  
	};

	webhookMethods \= {  
		default: {  
			async checkExists(this: IHookFunctions): Promise\<boolean\> {  
				const webhookUrl \= this.getNodeWebhookUrl('default') as string;  
				const credentials \= await this.getCredentials('zaloBotApi');  
				const botToken \= credentials.botToken as string;  
				const baseUrl \= 'https://bot-api.zaloplatforms.com';

				const options \= {  
					method: 'POST',  
					uri: \`${baseUrl}/bot${botToken}/getWebhookInfo\`,  
					json: true,  
				};

				try {  
					const response \= await this.helpers.request(options);  
					if (response.ok && response.result && response.result.url) {  
						const normalizeUrl \= (url: string) \=\> url.replace(/\\/+$/, '');  
						if (normalizeUrl(response.result.url) \=== normalizeUrl(webhookUrl)) {  
							return true;  
						}  
					}  
					return false;  
				} catch (error) {  
					return false;  
				}  
			},

			async create(this: IHookFunctions): Promise\<boolean\> {  
				const webhookUrl \= this.getNodeWebhookUrl('default') as string;  
				const credentials \= await this.getCredentials('zaloBotApi');  
				const botToken \= credentials.botToken as string;  
				const baseUrl \= 'https://bot-api.zaloplatforms.com';

				// Sinh khóa bảo mật tự động bằng cách băm SHA256 mã token của bot  
				const secretToken \= createHash('sha256')  
					.update(botToken)  
					.digest('hex')  
					.substring(0, 32);

				const options \= {  
					method: 'POST',  
					uri: \`${baseUrl}/bot${botToken}/setWebhook\`,  
					body: {  
						url: webhookUrl,  
						secret\_token: secretToken,  
					},  
					json: true,  
				};

				const response \= await this.helpers.request(options);

				if (response.ok) {  
					// Lưu khóa bí mật vào bộ nhớ tĩnh của nút để phục vụ việc xác thực sự kiện về sau  
					const webhookData \= this.getWorkflowStaticData('node');  
					webhookData.secretToken \= secretToken;  
					return true;  
				}  
				return false;  
			},

			async delete(this: IHookFunctions): Promise\<boolean\> {  
				const credentials \= await this.getCredentials('zaloBotApi');  
				const botToken \= credentials.botToken as string;  
				const baseUrl \= 'https://bot-api.zaloplatforms.com';

				const options \= {  
					method: 'POST',  
					uri: \`${baseUrl}/bot${botToken}/deleteWebhook\`,  
					json: true,  
				};

				try {  
					const response \= await this.helpers.request(options);  
					return \!\!response.ok;  
				} catch (error) {  
					return false;  
				}  
			},  
		},  
	};

	async webhook(this: IWebhookFunctions): Promise\<IWebhookResponseData\> {  
		const req \= this.getRequestObject();  
		const headers \= req.headers;  
		const bodyData \= this.getBodyData();

		// Trích xuất khóa bảo mật đã lưu trong quá trình kích hoạt dòng công việc  
		const webhookData \= this.getWorkflowStaticData('node');  
		const savedSecretToken \= webhookData.secretToken as string;

		// Kiểm tra tính hợp lệ và nguồn gốc của yêu cầu đẩy sự kiện  
		const incomingSecretToken \= headers\['x-bot-api-secret-token'\];  
		if (incomingSecretToken \!== savedSecretToken) {  
			return {  
				noResponseToWebhook: true,  
			};  
		}

		// Định dạng dữ liệu sự kiện nhận được để đưa vào các nút tiếp theo trong dòng công việc n8n  
		return {  
			workflowData: \[  
				this.helpers.returnJsonArray(bodyData.result || bodyData),  
			\],  
		};  
	}  
}

## **Quản trị Lỗi, Quản lý Tần suất và Kiểm thử Hệ thống**

### **Quản trị Lỗi và Phản hồi API**

Hệ thống Zalo Bot Platform vận hành dựa trên các mã phản hồi HTTP tiêu chuẩn để thông báo trạng thái xử lý các yêu cầu10. Việc tích hợp hệ thống kiểm soát lỗi chặt chẽ trong nút n8n giúp tăng cường tính minh bạch của luồng tự động hóa14. Khi gặp các sự cố, hệ thống nút cần chủ động bóc tách thông báo phản hồi từ Zalo để ném ra các lỗi có ngữ cảnh rõ ràng bằng lớp đối tượng NodeOperationError của n8n14.

| Mã lỗi HTTP | Tên Lỗi Kỹ thuật | Nguyên nhân và Bối cảnh lỗi | Hành vi và Khuyến nghị Xử lý trong n8n |
| :---- | :---- | :---- | :---- |
| 400 | Bad Request | Đường dẫn API bị nhập sai hoặc định dạng dữ liệu payload JSON không đồng bộ10. | Ném lỗi nghiệp vụ rõ ràng, yêu cầu kiểm tra tính khớp nối của các trường nhập liệu14. |
| 401 | Unauthorized | Mã thông báo Bot Token không tồn tại, sai định dạng hoặc đã bị hủy bỏ từ hệ thống quản lý10. | Ngắt dòng công việc ngay lập tức, đưa ra cảnh báo yêu cầu cấu hình lại thông tin xác thực18. |
| 403 | Internal Error | Sự cố xảy ra bên trong hệ thống xử lý nội bộ của máy chủ Zalo10. | Cấu hình cơ chế tự động thử lại (Retry) sau một khoảng thời gian chờ cố định27. |
| 404 | Not Found | Điểm cuối API bị truy cập không hợp lệ10. | Báo lỗi đường dẫn hệ thống không tồn tại14. |
| 408 | Request Timeout | Thời gian xử lý yêu cầu vượt quá hạn mức cho phép của hệ thống10. | Tăng thời gian chờ HTTP tối đa thông qua cấu hình WithTimeout trong các tham số bổ sung27. |
| 429 | Quota Exceeded | Số lượng yêu cầu từ bot vượt quá giới hạn băng thông cho phép trong một đơn vị thời gian10. | Áp dụng cơ chế xếp hàng (queueing) hoặc giãn cách tần suất gọi API trong các luồng phát tin hàng loạt3. |

### **Kiểm thử và Đóng gói Package Triển khai Thực tế**

Khi nút đã được xây dựng hoàn tất, việc đóng gói và kiểm thử trên môi trường thực tế cần tuân thủ các bước chuẩn bị nghiêm ngặt để đảm bảo khả năng tương thích cao nhất2:

* **Tích hợp Thử nghiệm Cục bộ**: Các kỹ sư có thể tận dụng công cụ CLI n8n-node để biên dịch trực tiếp dự án TypeScript thành mã nguồn JavaScript tương thích13. Thư mục chứa nút sau khi biên dịch cần được liên kết trực tiếp vào thư mục cài đặt tùy biến của môi trường n8n (thường nằm ở \~/.n8n/custom/ hoặc cấu hình qua biến môi trường N8N\_CUSTOM\_EXTENSIONS trong các container Docker)2.  
* **Vận hành Hệ thống trên Môi trường Phân tán**: Đối với các hệ thống lớn chạy n8n dưới dạng cụm (Cluster) gồm một máy chủ chính điều phối và nhiều máy chủ thợ (Worker), tệp định nghĩa của nút tùy biến bắt buộc phải được cài đặt đồng nhất trên toàn bộ các container vận hành2. Việc thiếu hụt tệp thư viện tại các nút thợ sẽ dẫn đến hiện tượng treo dòng công việc hoặc lỗi thực thi cục bộ khi tác vụ được phân bổ ngẫu nhiên2.  
* **Đóng gói và Xuất bản**: Tệp cấu hình package.json của nút cần được định nghĩa chính xác từ khóa "n8n-community-node-package" trong mảng keywords để hệ thống n8n có thể tự động nhận diện và liệt kê trong danh mục cài đặt cộng đồng19. Sau khi kiểm thử nội bộ hoàn tất, nút có thể được phân phối công khai thông qua kho lưu trữ npm hoặc lưu trữ nội bộ bằng các luồng kéo trực tiếp từ kho mã nguồn Git của doanh nghiệp18.

#### **Nguồn trích dẫn**

1. Zalo \- Yellow.ai Documentation, [https://docs.yellow.ai/docs/platform\_concepts/channelConfiguration/zalo](https://docs.yellow.ai/docs/platform_concepts/channelConfiguration/zalo)  
2. n8n-nodes-zalo-platform | Yarn, [https://classic.yarnpkg.com/en/package/n8n-nodes-zalo-platform](https://classic.yarnpkg.com/en/package/n8n-nodes-zalo-platform)  
3. Handle Vietnamese SME customer care on Zalo Bot with Gemini and Google Sheets \- N8N, [https://n8n.io/workflows/14816-handle-vietnamese-sme-customer-care-on-zalo-bot-with-gemini-and-google-sheets/](https://n8n.io/workflows/14816-handle-vietnamese-sme-customer-care-on-zalo-bot-with-gemini-and-google-sheets/)  
4. Zalo \- Jarvis, [https://jarvis.cx/help/jarvis-helpdesk/user-guideline/zalo](https://jarvis.cx/help/jarvis-helpdesk/user-guideline/zalo)  
5. Automated Zalo OA token management with OAuth and webhook integration \- N8N, [https://n8n.io/workflows/8675-automated-zalo-oa-token-management-with-oauth-and-webhook-integration/](https://n8n.io/workflows/8675-automated-zalo-oa-token-management-with-oauth-and-webhook-integration/)  
6. Go Zalo Bot SDK \- GitHub, [https://github.com/vkhangstack/go-zalo-bot](https://github.com/vkhangstack/go-zalo-bot)  
7. @hienhoceo/n8n-nodes-zalo-bot \- NPM, [https://www.npmjs.com/package/@hienhoceo/n8n-nodes-zalo-bot](https://www.npmjs.com/package/@hienhoceo/n8n-nodes-zalo-bot)  
8. getUpdates \- Zalo Bot Platform, [https://bot.zapps.me/docs/apis/getUpdates/](https://bot.zapps.me/docs/apis/getUpdates/)  
9. Webhook \- Zalo Bot Platform, [https://bot.zapps.me/docs/webhook/](https://bot.zapps.me/docs/webhook/)  
10. sendMessage \- Zalo Bot Platform, [https://bot.zapps.me/docs/apis/sendMessage/](https://bot.zapps.me/docs/apis/sendMessage/)  
11. sendPhoto \- Zalo Bot Platform, [https://bot.zapps.me/docs/apis/sendPhoto/](https://bot.zapps.me/docs/apis/sendPhoto/)  
12. setWebhook \- Zalo Bot Platform, [https://bot.zapps.me/docs/apis/setWebhook/](https://bot.zapps.me/docs/apis/setWebhook/)  
13. Code standards \- n8n Docs, [https://docs.n8n.io/integrations/creating-nodes/build/reference/code-standards/](https://docs.n8n.io/integrations/creating-nodes/build/reference/code-standards/)  
14. Building Custom n8n Nodes Without Losing Your Weekend | by Duckweave \- Medium, [https://medium.com/@duckweave/building-custom-n8n-nodes-without-losing-your-weekend-bf70fe4913df](https://medium.com/@duckweave/building-custom-n8n-nodes-without-losing-your-weekend-bf70fe4913df)  
15. getMe \- Zalo Bot Platform, [https://bot.zapps.me/docs/apis/getMe/](https://bot.zapps.me/docs/apis/getMe/)  
16. sendChatAction \- Zalo Bot Platform, [https://bot.zapps.me/docs/apis/sendChatAction/](https://bot.zapps.me/docs/apis/sendChatAction/)  
17. Telegram Trigger: webhook URL silently cleared \~15s after activation, no last\_error\_message · Issue \#30574 · n8n-io/n8n \- GitHub, [https://github.com/n8n-io/n8n/issues/30574](https://github.com/n8n-io/n8n/issues/30574)  
18. Building custom n8n nodes: Extending workflows beyond built-ins \- LumaDock, [https://lumadock.com/tutorials/custom-n8n-nodes-guide](https://lumadock.com/tutorials/custom-n8n-nodes-guide)  
19. n8n-nodes-zalo-platform \- UNPKG, [https://app.unpkg.com/n8n-nodes-zalo-platform@1.0.13/files/package.json](https://app.unpkg.com/n8n-nodes-zalo-platform@1.0.13/files/package.json)  
20. Writing My First Custom n8n Node: A Step-by-Step Guide \- Franky's Notes, [https://www.frankysnotes.com/2026/01/writing-my-first-custom-n8n-node-step.html](https://www.frankysnotes.com/2026/01/writing-my-first-custom-n8n-node-step.html)  
21. n8n node for OpnForm \- GitHub, [https://github.com/OpnForm/n8n-nodes-opnform](https://github.com/OpnForm/n8n-nodes-opnform)  
22. n8n/packages/nodes-base/nodes/TheHive/TheHiveTrigger.node.ts at master \- GitHub, [https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/TheHive/TheHiveTrigger.node.ts](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/TheHive/TheHiveTrigger.node.ts)  
23. Creating custom n8n webhook node \- Questions, [https://community.n8n.io/t/creating-custom-n8n-webhook-node/140929](https://community.n8n.io/t/creating-custom-n8n-webhook-node/140929)  
24. n8n-nodes-zalo-platform 1.0.11 on npm \- Libraries.io \- security, [https://libraries.io/npm/n8n-nodes-zalo-platform](https://libraries.io/npm/n8n-nodes-zalo-platform)  
25. New node building and the node not appear im workflow \- \#51 by Waqas\_Shaukat, [https://community.n8n.io/t/new-node-building-and-the-node-not-appear-im-workflow/32705/51](https://community.n8n.io/t/new-node-building-and-the-node-not-appear-im-workflow/32705/51)  
26. N8N unable to create multiple webhooks in Helpscout · Issue \#13957 \- GitHub, [https://github.com/n8n-io/n8n/issues/13957](https://github.com/n8n-io/n8n/issues/13957)  
27. zalobotapi package \- github.com/nduyhai/go-zalo-bot-api \- Go Packages, [https://pkg.go.dev/github.com/nduyhai/go-zalo-bot-api](https://pkg.go.dev/github.com/nduyhai/go-zalo-bot-api)

[image1]: <data:image/png;base64,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>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAABECAYAAAA89WlXAAARx0lEQVR4Xu2dCahmyVWAj6i4JmrcY5LumNFBImpwCcFtXKLGoIiJjOCgoKBBAy7BLTHQICLBBRVjxAiNhokLISqDRh1xflRUVBIVzUgcoSNR0aCiaCBxvd/UPfPOf17dv1/3e/36dfJ9ULx3q+69tdxT55w6Va87QkRERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERE7KJy3p9T1TTs17LunlS3qPXvAuxBcv6a6eKXcMz13Sk3rmOzF/tKSv6JkLT4x5vsipePOS/q+k3ZLef/1Z87kPvrPlc98hPjmO7t3iS2KU/2eM+28V2Y6P7AUr2Y5D6VeX9N75wAl41ZJe2TPvYC4t6XuX9G69IPbH6YWt7N9LGen99osvHB++pL+J0dafbmX0/evjbPvAO9/S8rrs0Z7kn1vZh5Qy6M9meseS7i73Jch1v/fb9u44P64u6bd65jnwv3HU919vZbSnjs0n7hdfSLLN/Oyyigx0mTkt/7Kk+8p1n/Ok56xlXd4+f81P3lbKesIp7PxYHL+PdB7cu6RP65mxnS9yalBWr2l5HxdD6P+45cNf9YwD4CBdb/LgqN1qhw1ox5bDlmxN9ifEcFyv93xl610zMNr398wLxv/0jMZfx+gv8tTZ9Yw7gJlM4sj865Ke0fJvlvdZ0gMxnMROOmYzB3nXMxoYve9rebyH931my4evilHGz9sJbfyROD7u5wERk1+K+ZizWN21vIvOtSV9acvDaaJ/Pf80vGBJX9QzYyxuqWsWdWM8Z7YleVyMZz+o5f9XbC8aKesyfx5s6UXy6afImfKXcXyFjyFhwry95cPP9YwDvLM4bMAq8kba+NIlfXfP3AAF9bs98wLBVl2XkQ4r54xU9K29R9r1ncDMYDAvntzyTsOzYj7H4JAs/n3PaPBcj1wA+UQkOkQSKbsI0SPm2I/3zHMAPfg5Mcbhqa2MBe3tcAZOA3Pxo1veuy/pM2Lu8Nwsf7ikD+iZMepmLGe7Eoxnj15XMmDQYdHMd5pFCLk/o3jnyS7mC67dkh7umSKnhdURwl4nMco+DQbbpAkTqSuBQ9zpDhvj8PPr7zgkX17K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REREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREzpD/ByoFXj0kFIlNAAAAAElFTkSuQmCC>