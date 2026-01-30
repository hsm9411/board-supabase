import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    signUp(signUpDto: SignUpDto): Promise<void>;
    signIn(signInDto: SignInDto): Promise<{
        accessToken: string;
    }>;
    getUserById(id: string): Promise<Omit<import("../entities/user.entity").User, "password">>;
    getUserByEmail(email: string): Promise<Omit<import("../entities/user.entity").User, "password">>;
}
